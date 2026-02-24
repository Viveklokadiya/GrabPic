import Link from "next/link";

export default function MarketingFooter() {
    const year = new Date().getFullYear();

    return (
        <footer className="w-full bg-white border-t border-slate-200">
            <div className="max-w-7xl mx-auto px-4 md:px-10 py-12">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                    <div className="col-span-2 md:col-span-1 flex flex-col gap-4">
                        <div className="flex items-center gap-2 text-slate-900">
                            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                    <circle cx="12" cy="13" r="4" />
                                </svg>
                            </div>
                            <span className="text-lg font-bold">GrabPic</span>
                        </div>
                        <p className="text-slate-500 text-sm leading-relaxed">
                            The future of event photography distribution. Fast, private, and powered by AI.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <h4 className="text-slate-900 font-bold text-sm">Product</h4>
                        <Link href="/#how" className="text-slate-500 hover:text-primary text-sm transition-colors">Features</Link>
                        <Link href="/pricing" className="text-slate-500 hover:text-primary text-sm transition-colors">Pricing</Link>
                        <Link href="/#how" className="text-slate-500 hover:text-primary text-sm transition-colors">How it Works</Link>
                        <Link href="/#waitlist" className="text-slate-500 hover:text-primary text-sm transition-colors">For Guests</Link>
                    </div>

                    <div className="flex flex-col gap-3">
                        <h4 className="text-slate-900 font-bold text-sm">Company</h4>
                        <Link href="/about" className="text-slate-500 hover:text-primary text-sm transition-colors">About</Link>
                        <Link href="/contact" className="text-slate-500 hover:text-primary text-sm transition-colors">Contact</Link>
                        <Link href="/#faq" className="text-slate-500 hover:text-primary text-sm transition-colors">FAQ</Link>
                    </div>

                    <div className="flex flex-col gap-3">
                        <h4 className="text-slate-900 font-bold text-sm">Legal</h4>
                        <Link href="/privacy" className="text-slate-500 hover:text-primary text-sm transition-colors">Privacy Policy</Link>
                        <Link href="/terms" className="text-slate-500 hover:text-primary text-sm transition-colors">Terms of Service</Link>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center border-t border-slate-100 pt-8 gap-4">
                    <p className="text-slate-400 text-sm">© {year} GrabPic Inc. All rights reserved.</p>
                    <div className="flex gap-4">
                        <a href="#" aria-label="Twitter" className="text-slate-400 hover:text-slate-600 transition-colors">
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                            </svg>
                        </a>
                        <a href="#" aria-label="Instagram" className="text-slate-400 hover:text-slate-600 transition-colors">
                            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                <path clipRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" fillRule="evenodd" />
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
