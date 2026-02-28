from __future__ import annotations

import logging
import time
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.db import SessionLocal
from app.ml.face_engine import FaceEngine
from app.models import Event, Face, FaceCluster, GuestQuery, GuestResult, Job, Photo
from app.services.clustering import cluster_event_faces
from app.services.jobs import (
    JOB_CLUSTER_EVENT,
    JOB_MATCH_GUEST,
    JOB_STATUS_QUEUED,
    JOB_STATUS_RUNNING,
    JOB_SYNC_EVENT,
    JOB_STATUS_CANCELED,
    JOB_STATUS_CANCEL_REQUESTED,
    acquire_next_job,
    create_job,
    mark_job_canceled,
    mark_job_completed,
    mark_job_failed,
    mark_job_progress,
    upsert_job_payload,
)
from app.services.matching import (
    collect_ranked_photo_matches,
    store_guest_results_from_ranked,
)
from app.services.storage import delete_if_exists, save_thumbnail, to_absolute_path
from app.utils.drive import build_content_stamp, download_public_drive_image, list_public_drive_images

logger = logging.getLogger("grabpic.worker")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")


def run_forever() -> None:
    settings = get_settings()
    face_engine = FaceEngine(settings)
    logger.info("Worker started")
    idle_ticks = 0

    while True:
        job_id = _claim_next_job()
        if not job_id:
            idle_ticks += 1
            if idle_ticks % max(1, int(60 / max(1, settings.job_idle_sleep_seconds))) == 0:
                _run_cleanup(settings)
            time.sleep(max(1, settings.job_idle_sleep_seconds))
            continue

        idle_ticks = 0
        try:
            with SessionLocal() as db:
                job = db.get(Job, job_id)
                if not job:
                    continue
                _dispatch_job(db=db, job=job, settings=settings, face_engine=face_engine)
                db.commit()
        except Exception as exc:
            logger.exception("Job %s failed: %s", job_id, exc)
            with SessionLocal() as db:
                job = db.get(Job, job_id)
                if not job:
                    continue
                if job.status in {JOB_STATUS_CANCELED, JOB_STATUS_CANCEL_REQUESTED}:
                    mark_job_canceled(db, job, reason="Canceled by admin")
                    if job.query_id:
                        query = db.get(GuestQuery, job.query_id)
                        if query:
                            query.status = "failed"
                            query.error_text = "Canceled by admin"
                            query.message = "Matching was canceled by admin."
                            db.add(query)
                    db.commit()
                    continue
                mark_job_failed(db, job, str(exc))
                if job.query_id:
                    query = db.get(GuestQuery, job.query_id)
                    if query:
                        query.status = "failed"
                        query.error_text = str(exc)
                        query.message = "Failed to process selfie"
                        db.add(query)
                db.commit()
            time.sleep(max(1, settings.job_poll_interval_seconds))


def _claim_next_job() -> str | None:
    with SessionLocal() as db:
        job = acquire_next_job(db)
        if not job:
            db.commit()
            return None
        job_id = job.id
        db.commit()
        return job_id


def _dispatch_job(db: Session, job: Job, settings: Settings, face_engine: FaceEngine) -> None:
    if job.job_type == JOB_SYNC_EVENT:
        _process_sync_event(db=db, job=job, settings=settings, face_engine=face_engine)
        return
    if job.job_type == JOB_CLUSTER_EVENT:
        _process_cluster_event(db=db, job=job, settings=settings)
        return
    if job.job_type == JOB_MATCH_GUEST:
        _process_match_guest(db=db, job=job, settings=settings, face_engine=face_engine)
        return
    mark_job_failed(db, job, f"Unsupported job type: {job.job_type}")


def _process_sync_event(db: Session, job: Job, settings: Settings, face_engine: FaceEngine) -> None:
    if not job.event_id:
        mark_job_failed(db, job, "sync_event job missing event_id")
        return
    event = db.get(Event, job.event_id)
    if not event:
        mark_job_failed(db, job, "Event not found")
        return
    if _is_cancel_requested(db, job.id):
        _cancel_sync_or_cluster_job(db=db, job=job, event=event)
        return

    mark_job_progress(db, job, progress_percent=1.0, stage="listing_drive_files")
    upsert_job_payload(
        job,
        {
            "phase": "listing",
            "total_listed": 0,
            "completed": 0,
            "processed": 0,
            "matched_faces": 0,
            "refreshed_files": 0,
            "reused_files": 0,
            "failures": 0,
        },
    )
    db.commit()

    # Refresh instances after the early commit so per-image progress is always
    # written even if one file fails later.
    event = db.get(Event, event.id)
    job = db.get(Job, job.id)
    if not event or not job:
        raise RuntimeError("Event or job missing after sync initialization commit")
    if _is_cancel_requested(db, job.id):
        _cancel_sync_or_cluster_job(db=db, job=job, event=event)
        return
    files = list_public_drive_images(
        api_key=settings.google_drive_api_key,
        folder_id=event.drive_folder_id,
        max_images=settings.max_sync_images,
    )
    files = [item for item in files if str(item.get("id") or "").strip()]
    total = len(files)
    if total == 0:
        event.status = "ready"
        mark_job_completed(
            db,
            job,
            stage="completed_no_images",
            payload={
                "phase": "completed",
                "total_listed": 0,
                "completed": 0,
                "processed": 0,
                "matched_faces": 0,
                "refreshed_files": 0,
                "reused_files": 0,
                "failures": 0,
            },
        )
        db.add(event)
        return

    existing_rows = db.execute(
        select(Photo.id, Photo.drive_file_id, Photo.content_stamp).where(Photo.event_id == event.id)
    ).all()
    existing_index: dict[str, tuple[str, str]] = {
        str(drive_file_id): (str(photo_id), str(content_stamp or ""))
        for photo_id, drive_file_id, content_stamp in existing_rows
        if str(drive_file_id or "").strip()
    }

    refresh_queue: list[tuple[dict, str, str | None]] = []
    seen_ids: set[str] = set()
    reused = 0
    for file_item in files:
        file_id = str(file_item.get("id") or "")
        if not file_id:
            continue
        seen_ids.add(file_id)
        stamp = build_content_stamp(file_item)
        existing = existing_index.get(file_id)
        if existing and existing[1] == stamp:
            reused += 1
            continue
        refresh_queue.append((file_item, stamp, existing[0] if existing else None))

    refreshed = 0
    failures = 0
    processed = reused
    matched_faces = 0
    if reused > 0:
        resumed_percent = max(2.0, min(95.0, (reused / total) * 100.0))
        mark_job_progress(db, job, progress_percent=resumed_percent, stage=f"resuming from {reused}/{total}")
        upsert_job_payload(
            job,
            {
                "phase": "processing",
                "total_listed": total,
                "completed": reused,
                "processed": processed,
                "matched_faces": matched_faces,
                "refreshed_files": refreshed,
                "reused_files": reused,
                "refresh_queue_total": len(refresh_queue),
                "failures": failures,
            },
        )
        db.commit()
        event = db.get(Event, event.id)
        job = db.get(Job, job.id)
        if not event or not job:
            raise RuntimeError("Event or job missing after sync resume commit")

    for refresh_idx, (file_item, stamp, existing_photo_id) in enumerate(refresh_queue, start=1):
        if _is_cancel_requested(db, job.id):
            _cancel_sync_or_cluster_job(db=db, job=job, event=event)
            return
        file_id = str(file_item.get("id") or "")
        if not file_id:
            continue
        try:
            photo = db.get(Photo, existing_photo_id) if existing_photo_id else None
            image_bytes = download_public_drive_image(api_key=settings.google_drive_api_key, file_id=file_id)
            thumb_path = save_thumbnail(
                settings=settings,
                event_id=event.id,
                drive_file_id=file_id,
                image_bytes=image_bytes,
                max_size=settings.thumbnail_max_size,
            )
            if not photo:
                photo = Photo(
                    event_id=event.id,
                    drive_file_id=file_id,
                    file_name=str(file_item.get("name") or file_id),
                    mime_type=str(file_item.get("mimeType") or "image/jpeg"),
                    web_view_link=str(file_item.get("webViewLink") or f"https://drive.google.com/file/d/{file_id}/view"),
                    preview_url=f"https://drive.google.com/thumbnail?id={file_id}&sz=w1200",
                    download_url=f"https://drive.google.com/uc?export=download&id={file_id}",
                    thumbnail_path=thumb_path,
                    content_stamp=stamp,
                    status="ok",
                )
                db.add(photo)
                db.flush()
            else:
                photo.file_name = str(file_item.get("name") or photo.file_name)
                photo.mime_type = str(file_item.get("mimeType") or photo.mime_type)
                photo.web_view_link = str(file_item.get("webViewLink") or photo.web_view_link)
                photo.preview_url = f"https://drive.google.com/thumbnail?id={file_id}&sz=w1200"
                photo.download_url = f"https://drive.google.com/uc?export=download&id={file_id}"
                photo.thumbnail_path = thumb_path
                photo.content_stamp = stamp
                photo.status = "ok"
                db.add(photo)
                db.execute(delete(Face).where(Face.photo_id == photo.id))

            faces = face_engine.embed_faces(image_bytes=image_bytes, max_faces=20)
            for face_idx, face in enumerate(faces):
                bx, by, bw, bh = face.bbox
                db.add(
                    Face(
                        event_id=event.id,
                        photo_id=photo.id,
                        face_index=face_idx,
                        embedding=face.embedding,
                        area_ratio=float(face.area_ratio),
                        det_confidence=float(face.det_confidence),
                        sharpness=float(face.sharpness),
                        bbox_x=float(bx),
                        bbox_y=float(by),
                        bbox_w=float(bw),
                        bbox_h=float(bh),
                        cluster_label=None,
                    )
                )
            # Flush each image's writes so validation/DB errors are handled
            # in this iteration, not deferred to a later commit.
            db.flush()
            matched_faces += len(faces)
            refreshed += 1
            processed += 1
        except Exception as exc:
            failures += 1
            logger.warning("Skipping Drive file %s due to error: %s", file_id, exc)
            db.rollback()
            event = db.get(Event, event.id)
            job = db.get(Job, job.id)
            if not event or not job:
                raise RuntimeError("Event or job missing after sync rollback")

        overall_completed = reused + refresh_idx
        percent = max(2.0, min(95.0, (overall_completed / total) * 100.0))
        mark_job_progress(db, job, progress_percent=percent, stage=f"processing image {overall_completed}/{total}")
        upsert_job_payload(
            job,
            {
                "phase": "processing",
                "total_listed": total,
                "completed": overall_completed,
                "processed": processed,
                "matched_faces": matched_faces,
                "refreshed_files": refreshed,
                "reused_files": reused,
                "refresh_queue_total": len(refresh_queue),
                "failures": failures,
                "current_file_id": file_id,
                "current_file_name": str(file_item.get("name") or file_id),
            },
        )
        db.commit()
        event = db.get(Event, event.id)
        job = db.get(Job, job.id)
        if not event or not job:
            raise RuntimeError("Event or job missing after sync progress commit")

    current_photos = db.execute(select(Photo).where(Photo.event_id == event.id)).scalars().all()
    for photo in current_photos:
        if photo.drive_file_id in seen_ids:
            continue
        db.execute(delete(Face).where(Face.photo_id == photo.id))
        db.execute(delete(GuestResult).where(GuestResult.photo_id == photo.id))
        db.delete(photo)

    existing_cluster_count = int(
        db.execute(select(func.count(FaceCluster.id)).where(FaceCluster.event_id == event.id)).scalar_one() or 0
    )
    should_recluster = refreshed > 0 or failures > 0 or existing_cluster_count == 0
    if should_recluster:
        event.status = "processing_clusters"
        db.add(event)

        create_job(
            db,
            job_type=JOB_CLUSTER_EVENT,
            event_id=event.id,
            payload={"trigger": "after_sync", "source_job_id": job.id},
            stage="queued_for_clustering",
        )
    else:
        event.status = "ready"
        db.add(event)

    mark_job_completed(
        db,
        job,
        stage="sync_completed" if should_recluster else "sync_completed_reused",
        payload={
            "phase": "completed",
            "total_listed": total,
            "completed": total,
            "processed": processed,
            "matched_faces": matched_faces,
            "refreshed_files": refreshed,
            "reused_files": reused,
            "refresh_queue_total": len(refresh_queue),
            "failures": failures,
            "cluster_reused": not should_recluster,
        },
    )


def _process_cluster_event(db: Session, job: Job, settings: Settings) -> None:
    if not job.event_id:
        mark_job_failed(db, job, "cluster_event job missing event_id")
        return
    event = db.get(Event, job.event_id)
    if not event:
        mark_job_failed(db, job, "Event not found")
        return
    if _is_cancel_requested(db, job.id):
        _cancel_sync_or_cluster_job(db=db, job=job, event=event)
        return
    mark_job_progress(db, job, progress_percent=96.0, stage="clustering_faces")
    upsert_job_payload(job, {"phase": "clustering"})
    cluster_count = cluster_event_faces(
        db,
        event_id=event.id,
        eps=settings.cluster_eps,
        min_samples=settings.cluster_min_samples,
    )
    event.status = "ready"
    db.add(event)
    mark_job_completed(
        db,
        job,
        stage="clustering_completed",
        payload={"phase": "completed", "cluster_count": cluster_count},
    )


def _process_match_guest(db: Session, job: Job, settings: Settings, face_engine: FaceEngine) -> None:
    if not job.query_id:
        mark_job_failed(db, job, "match_guest job missing query_id")
        return
    query = db.get(GuestQuery, job.query_id)
    if not query:
        mark_job_failed(db, job, "Guest query not found")
        return
    if _is_cancel_requested(db, job.id):
        _cancel_match_job(db=db, job=job, query=query)
        return
    event = db.get(Event, query.event_id)
    if not event:
        query.status = "failed"
        query.error_text = "Event not found"
        query.message = "Event not found"
        db.add(query)
        mark_job_failed(db, job, "Event not found")
        return

    query.status = "running"
    query.message = "Matching selfie with clusters..."
    db.add(query)
    mark_job_progress(db, job, progress_percent=10.0, stage="loading_selfie")
    upsert_job_payload(job, {"phase": "matching", "steps": "loading_selfie"})
    db.flush()
    if _is_cancel_requested(db, job.id):
        _cancel_match_job(db=db, job=job, query=query)
        return

    selfie_path = to_absolute_path(settings, query.selfie_path)
    if not selfie_path.exists():
        query.status = "failed"
        query.error_text = "Selfie file missing"
        query.message = "Selfie file missing"
        db.add(query)
        mark_job_failed(db, job, "Selfie file missing")
        return

    selfie_bytes = selfie_path.read_bytes()
    processed_count, total_count = _sync_progress_counts(db, event.id)
    remaining_count = max(0, total_count - processed_count) if total_count > 0 else 0

    selfie_embedding = face_engine.embed_single_face(selfie_bytes)
    if selfie_embedding is None:
        query.status = "completed"
        query.cluster_id = None
        query.confidence = 0.0
        if remaining_count > 0:
            query.message = (
                "No clear face found in selfie. Please upload a clearer front-facing photo. "
                f"{remaining_count} photo(s) are still syncing."
            )
        else:
            query.message = "No clear face found in selfie. Please upload a clearer front-facing photo."
        query.completed_at = datetime.now(timezone.utc)
        db.add(query)
        mark_job_completed(db, job, stage="match_completed_no_face", payload={"result": "no_face"})
        return

    mark_job_progress(db, job, progress_percent=45.0, stage="matching faces")
    upsert_job_payload(job, {"phase": "matching", "steps": "matching_faces"})
    if _is_cancel_requested(db, job.id):
        _cancel_match_job(db=db, job=job, query=query)
        return

    ranked_matches, used_threshold, adaptive_used = collect_ranked_photo_matches(
        db,
        event_id=event.id,
        selfie_embedding=selfie_embedding,
        threshold_percent=settings.face_similarity_threshold_percent,
        top_margin=settings.face_top_margin,
        relax_drop=settings.face_auto_relax_drop,
        relax_min_threshold=settings.face_auto_relax_min_threshold,
        max_results=160,
    )
    if not ranked_matches:
        query.status = "completed"
        query.cluster_id = None
        query.confidence = 0.0
        if remaining_count > 0:
            query.message = (
                f"No confident match found in {processed_count} processed photo(s). "
                f"{remaining_count} photo(s) are still syncing."
            )
        else:
            query.message = "No confident match found. Try a clearer selfie."
        query.completed_at = datetime.now(timezone.utc)
        db.add(query)
        mark_job_completed(
            db,
            job,
            stage="match_completed_no_confident_cluster",
            payload={"result": "no_confident_match", "threshold_percent": float(used_threshold)},
        )
        return

    mark_job_progress(db, job, progress_percent=70.0, stage="assembling_photo_results")
    upsert_job_payload(job, {"phase": "matching", "steps": "assembling_photo_results"})
    if _is_cancel_requested(db, job.id):
        _cancel_match_job(db=db, job=job, query=query)
        return
    results = store_guest_results_from_ranked(
        db,
        query=query,
        ranked_matches=ranked_matches,
    )
    top_confidence = float(max((item.score_ratio for item in ranked_matches), default=0.0))
    query.status = "completed"
    query.cluster_id = None
    query.confidence = top_confidence
    if remaining_count > 0:
        query.message = (
            f"Found {len(results)} matching photo(s) from {processed_count} processed photo(s). "
            f"{remaining_count} photo(s) are still syncing."
        )
    else:
        query.message = f"Found {len(results)} matching photo(s)."
    query.completed_at = datetime.now(timezone.utc)
    db.add(query)

    mark_job_completed(
        db,
        job,
        stage="match_completed",
        payload={
            "cluster_id": None,
            "confidence": float(top_confidence),
            "photos": len(results),
            "threshold_percent": float(used_threshold),
            "adaptive_threshold_used": bool(adaptive_used),
        },
    )


def _sync_progress_counts(db: Session, event_id: str) -> tuple[int, int]:
    latest_sync = (
        db.execute(
            select(Job)
            .where(Job.event_id == event_id, Job.job_type == JOB_SYNC_EVENT)
            .order_by(Job.created_at.desc())
            .limit(1)
        )
        .scalars()
        .first()
    )
    payload = dict(latest_sync.payload or {}) if latest_sync else {}
    total = int(payload.get("total_listed") or payload.get("total_photos") or 0)
    processed = int(payload.get("completed") or payload.get("processed") or 0)

    photo_count = int(db.execute(select(func.count(Photo.id)).where(Photo.event_id == event_id)).scalar_one() or 0)
    if total <= 0:
        total = photo_count
    if processed <= 0:
        processed = photo_count
    processed = max(processed, photo_count)
    if total > 0 and processed > total:
        processed = total
    return max(0, int(processed)), max(0, int(total))


def _enqueue_auto_sync_jobs(db: Session, settings: Settings) -> int:
    if not bool(settings.auto_sync_enabled):
        return 0
    if not settings.google_drive_api_key:
        return 0

    now = datetime.now(timezone.utc)
    interval = timedelta(minutes=max(1, int(settings.auto_sync_interval_minutes)))
    batch = max(1, int(settings.auto_sync_batch_size))

    events = (
        db.execute(
            select(Event)
            .where(Event.status.in_(["ready", "failed", "canceled", "cancel_requested"]))
            .order_by(Event.updated_at.asc())
            .limit(500)
        )
        .scalars()
        .all()
    )

    queued = 0
    for event in events:
        active = db.execute(
            select(Job.id)
            .where(
                Job.event_id == event.id,
                Job.job_type.in_([JOB_SYNC_EVENT, JOB_CLUSTER_EVENT]),
                Job.status.in_([JOB_STATUS_QUEUED, JOB_STATUS_RUNNING, JOB_STATUS_CANCEL_REQUESTED]),
            )
            .limit(1)
        ).scalar_one_or_none()
        if active:
            continue

        last_sync = (
            db.execute(
                select(Job)
                .where(Job.event_id == event.id, Job.job_type == JOB_SYNC_EVENT)
                .order_by(Job.updated_at.desc())
                .limit(1)
            )
            .scalars()
            .first()
        )
        if last_sync:
            last_at = last_sync.updated_at or last_sync.created_at
            if last_at and (now - last_at) < interval:
                continue

        event.status = "syncing"
        db.add(event)
        create_job(
            db,
            job_type=JOB_SYNC_EVENT,
            event_id=event.id,
            payload={"trigger": "auto_refresh"},
            stage="queued_for_sync",
        )
        queued += 1
        if queued >= batch:
            break

    return queued


def _run_cleanup(settings: Settings) -> None:
    with SessionLocal() as db:
        now = datetime.now(timezone.utc)
        expired = (
            db.execute(
                select(GuestQuery).where(GuestQuery.expires_at <= now, GuestQuery.selfie_path != "")
            )
            .scalars()
            .all()
        )
        for query in expired:
            delete_if_exists(settings, query.selfie_path)
            query.selfie_path = ""
            db.add(query)

        queued = _enqueue_auto_sync_jobs(db, settings)
        if queued > 0:
            logger.info("Auto-sync queued %s event(s)", queued)
        db.commit()


def _is_cancel_requested(db: Session, job_id: str) -> bool:
    state = db.execute(select(Job.status).where(Job.id == job_id).limit(1)).scalar_one_or_none()
    return state == JOB_STATUS_CANCEL_REQUESTED


def _cancel_sync_or_cluster_job(db: Session, job: Job, event: Event) -> None:
    event.status = "canceled"
    db.add(event)
    upsert_job_payload(job, {"phase": "canceled"})
    mark_job_canceled(db, job, reason="Canceled by admin")


def _cancel_match_job(db: Session, job: Job, query: GuestQuery) -> None:
    query.status = "failed"
    query.error_text = "Canceled by admin"
    query.message = "Matching was canceled by admin."
    query.completed_at = datetime.now(timezone.utc)
    db.add(query)
    upsert_job_payload(job, {"phase": "canceled"})
    mark_job_canceled(db, job, reason="Canceled by admin")


def run_pool() -> None:
    settings = get_settings()
    workers = max(1, int(settings.worker_concurrency))
    if workers == 1:
        run_forever()
        return

    import multiprocessing as mp

    logger.info("Starting worker pool with %s processes", workers)
    procs: list[mp.Process] = []
    for index in range(workers):
        proc = mp.Process(target=run_forever, name=f"grabpic-worker-{index + 1}")
        proc.start()
        procs.append(proc)

    try:
        for proc in procs:
            proc.join()
    except KeyboardInterrupt:
        logger.info("Stopping worker pool")
        for proc in procs:
            if proc.is_alive():
                proc.terminate()
        for proc in procs:
            proc.join()


if __name__ == "__main__":
    run_pool()
