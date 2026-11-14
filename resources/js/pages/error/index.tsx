import { Head, Link } from "@inertiajs/react";
import Icon from "@/components/ui/icon";

const ErrorPage = ({ status }: { status: number }) => {
    return (
        <>
            <Head title={`Error ${status || ''} - Vegetable POS`} />
            <div className="bg-[#f4f7f4] min-h-screen flex flex-col items-center justify-center p-4 relative font-sans">
                {/* Top Center: Back to Dashboard Button */}
                <div className="w-full flex justify-center py-4 absolute top-2 left-0 right-0 z-10">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#14532d] hover:bg-[#0f3d21] text-white font-semibold text-xs md:text-sm shadow-md transition-all cursor-pointer"
                    >
                        <Icon name="ArrowLeft" className="w-4 h-4" weight="bold" />
                        <span>Dashboard par wapas jayein</span>
                    </Link>
                </div>

                {status === 404 && (
                    <div className="text-center flex flex-col gap-3 items-center justify-center max-w-lg">
                        <img src="/icons/svgs/19.svg" className="w-64 h-64 md:w-80 md:h-80" alt="404" />
                        <h1 className="text-3xl font-bold text-gray-900">Page nahi mila</h1>
                        <p className="text-gray-600 text-sm">
                            Aap jis safha par jana chah rahe hain woh maujood nahi hai.
                        </p>
                        <div className="pt-2">
                            <Link
                                href="/dashboard"
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#14532d] hover:bg-[#0f3d21] text-white font-semibold text-xs shadow-xs"
                            >
                                Dashboard par wapas jayein
                            </Link>
                        </div>
                    </div>
                )}

                {status !== 404 && (
                    <div className="text-center flex flex-col gap-3 items-center justify-center max-w-lg">
                        <img src="/icons/svgs/20.svg" className="w-64 h-64 md:w-80 md:h-80" alt="500" />
                        <h1 className="text-3xl font-bold text-gray-900">Server par masla pesh aaya</h1>
                        <p className="text-gray-600 text-sm">
                            Server mein koi takneeki kharabi aayi hai. Baraye meherbani thori der baad koshish karein ya Dashboard par jayein.
                        </p>
                        <div className="pt-2">
                            <Link
                                href="/dashboard"
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#14532d] hover:bg-[#0f3d21] text-white font-semibold text-xs shadow-xs"
                            >
                                Dashboard par wapas jayein
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default ErrorPage;
