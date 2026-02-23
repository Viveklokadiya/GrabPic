"use client";

import { useState } from "react";

type SyncTask = {
    id: string;
    name: string;
    photos: number;
    folder: string;
    status: "syncing" | "synced" | "failed";
};

const MOCK_TASKS: SyncTask[] = [
    { id: "1", name: "Sarah & Mike Wedding", photos: 142, folder: ".../Weddings/Sarah_Mike", status: "syncing" },
    { id: "2", name: "Tech Conf 2023", photos: 850, folder: ".../Events/TechConf", status: "synced" },
];

export default function CloudStoragePage() {
    const [googleConnected] = useState(true);
    const [oneDriveConnected] = useState(false);
    const [showFolderPicker, setShowFolderPicker] = useState(false);
    const [selectedFolder, setSelectedFolder] = useState("Weddings");

    const folders = ["2023 Events", "Weddings", "Portraits", "Commercial"];

    function statusBadge(status: SyncTask["status"]) {
        if (status === "syncing") return "bg-blue-50 text-blue-700 border border-blue-200";
        if (status === "synced") return "bg-emerald-50 text-emerald-700 border border-emerald-200";
        return "bg-red-50 text-red-700 border border-red-200";
    }

    return (
        <div className="flex flex-col gap-8 max-w-5xl mx-auto w-full">
            {/* Header */}
            <div>
                <nav className="flex items-center gap-2 text-sm text-slate-400 mb-4">
                    <span>Workspace</span>
                    <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                    <span>Settings</span>
                    <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                    <span className="text-slate-900 font-medium">Cloud Storage</span>
                </nav>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Connect Cloud Storage</h1>
                <p className="text-slate-500 mt-2 text-sm max-w-2xl">
                    Sync your high-resolution event photos directly to your preferred cloud provider. Select a provider below to authorize access and choose a destination folder.
                </p>
            </div>

            {/* Provider Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Google Drive — Connected */}
                <div className="group relative flex flex-col rounded-xl border-2 border-primary bg-white shadow-lg shadow-primary/5 p-6">
                    <div className="absolute top-4 right-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                            <span className="material-symbols-outlined text-[14px]">check_circle</span>
                            Connected
                        </span>
                    </div>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="flex items-center justify-center size-16 rounded-xl bg-slate-50 border border-slate-100 p-3">
                            <svg className="w-full h-full" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                                <path d="m6.6 66.85 25.3-43.8 25.3 43.8z" fill="#0066da" />
                                <path d="m43.8 23.05 25.3-43.8h-50.6z" fill="#00ac47" />
                                <path d="m66.6 23.05 20.7 35.8h-46l-25.3-43.8z" fill="#ea4335" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">Google Drive</h3>
                            <p className="text-sm text-slate-500">user@photography.studio</p>
                        </div>
                    </div>
                    <div className="mt-auto border-t border-slate-100 pt-5">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Sync Destination Folder</label>
                        <div className="bg-slate-50 rounded-lg border border-slate-200 mb-4 overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Path</span>
                                <button
                                    onClick={() => setShowFolderPicker(true)}
                                    className="text-xs text-primary font-semibold hover:text-primary/80 transition-colors"
                                >
                                    Change
                                </button>
                            </div>
                            <div className="px-4 py-3 flex items-center gap-2 text-sm text-slate-700">
                                <span className="material-symbols-outlined text-slate-400 text-[18px]">folder_open</span>
                                <span className="truncate">/ Photography / Client Events / 2024 / {selectedFolder}</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-400">Last synced: 2 mins ago</span>
                            <button className="px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                Disconnect
                            </button>
                        </div>
                    </div>
                </div>

                {/* OneDrive — Disconnected */}
                <div className="group flex flex-col rounded-xl border border-slate-200 bg-white p-6 hover:border-primary/40 hover:shadow-md transition-all">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="flex items-center justify-center size-16 rounded-xl bg-slate-50 border border-slate-100 p-3 grayscale group-hover:grayscale-0 transition-all">
                            <svg className="w-full h-full" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                                <path d="M42.3,16.8c-0.2,0-0.5,0-0.7,0c-0.8-4-4.4-7-8.6-7c-4.9,0-8.9,3.9-8.9,8.8c0,0.2,0,0.5,0,0.7C22.6,18.4,21.3,18,20,18c-4.4,0-8,3.6-8,8c0,0.1,0,0.2,0,0.3C8.6,27.2,6,30.3,6,34c0,4.4,3.6,8,8,8h29c4.4,0,8-3.6,8-8C51,29.8,47.2,26.3,42.3,16.8z" fill="#0078D4" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 group-hover:text-primary transition-colors">Microsoft OneDrive</h3>
                            <p className="text-sm text-slate-500">Connect your Microsoft account</p>
                        </div>
                    </div>
                    <div className="mt-auto border-t border-slate-100 pt-5">
                        <p className="text-sm text-slate-500 mb-4">Authorize GrabPic to access your OneDrive folders to begin syncing.</p>
                        <button className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-colors">
                            <span>Connect OneDrive</span>
                            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Active Sync Tasks */}
            <div className="mt-4">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold text-slate-900">Active Sync Tasks</h2>
                    <button className="text-sm text-primary font-semibold hover:underline">View History</button>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Event Name</th>
                                <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Destination</th>
                                <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-5 py-3.5 text-right" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {MOCK_TASKS.map((task) => (
                                <tr key={task.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 rounded-lg bg-slate-200 flex-shrink-0 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-slate-400 text-[20px]">event</span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900">{task.name}</p>
                                                <p className="text-xs text-slate-400">{task.photos} Photos</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 hidden md:table-cell">
                                        <div className="flex items-center gap-1.5 text-sm text-slate-500">
                                            <span className="material-symbols-outlined text-slate-400 text-[16px]">folder_shared</span>
                                            {task.folder}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge(task.status)}`}>
                                            {task.status === "syncing" ? (
                                                <span className="size-1.5 rounded-full bg-blue-500 animate-pulse" />
                                            ) : (
                                                <span className="material-symbols-outlined text-[12px]">{task.status === "synced" ? "check" : "error"}</span>
                                            )}
                                            {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <button className="text-slate-300 hover:text-slate-600 transition-colors">
                                            <span className="material-symbols-outlined text-[20px]">more_vert</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Folder Picker Modal */}
            {showFolderPicker && (
                <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[80vh]">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900">Select Folder</h3>
                            <button onClick={() => setShowFolderPicker(false)} className="text-slate-400 hover:text-slate-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-2 overflow-y-auto flex-1">
                            <div className="px-3 py-2 text-sm text-slate-500 flex items-center gap-1.5 mb-2">
                                <span className="material-symbols-outlined text-[16px]">cloud</span>
                                My Drive
                                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                                <span className="text-slate-900 font-medium">Photography</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                {folders.map((folder) => (
                                    <button
                                        key={folder}
                                        onClick={() => setSelectedFolder(folder)}
                                        className={`flex items-center gap-3 px-3 py-3 rounded-lg w-full text-left transition-colors ${selectedFolder === folder
                                                ? "bg-primary/5 border border-primary/20"
                                                : "hover:bg-slate-50"
                                            }`}
                                    >
                                        <span className={`material-symbols-outlined ${selectedFolder === folder ? "text-primary" : "text-slate-400"}`}>
                                            {selectedFolder === folder ? "folder_open" : "folder"}
                                        </span>
                                        <span className={`flex-1 text-sm font-medium ${selectedFolder === folder ? "text-slate-900" : "text-slate-700"}`}>{folder}</span>
                                        {selectedFolder === folder ? (
                                            <span className="material-symbols-outlined text-primary text-[18px]">check</span>
                                        ) : (
                                            <span className="material-symbols-outlined text-slate-300 text-[18px]">chevron_right</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-2xl">
                            <button onClick={() => setShowFolderPicker(false)} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
                            <button onClick={() => setShowFolderPicker(false)} className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 transition-colors">Select Folder</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
