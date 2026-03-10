import Link from 'next/link'

type Profile = {
    username: string | null
    profile_url: string | null
    coins: number
    level: number
}

export default function Navbar({ profile }: { profile: Profile | null }) {
    return (
        <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-black border-t border-gray-800">
            <div className="grid h-full max-w-lg grid-cols-5 mx-auto font-medium">
                <Link
                    href="/dashboard/quests"
                    className="inline-flex flex-col items-center justify-center px-8 hover:bg-gray-900 group"
                >
                    <svg
                        className="w-6 h-6 mb-1 text-gray-400 group-hover:text-gray-200"
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9 2 2 4-4"
                        />
                    </svg>
                    <span className="text-sm text-gray-400 group-hover:text-gray-200">
                        Quests
                    </span>
                </Link>

                <Link
                    href="/dashboard/bag"
                    className="inline-flex flex-col items-center justify-center px-8 hover:bg-gray-900 group"
                >
                    <svg
                        className="w-6 h-6 mb-1 text-gray-400 group-hover:text-gray-200"
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M17 8H5m12 0a1 1 0 0 1 1 1v2.6M17 8l-4-4M5 8a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.6M5 8l4-4 4 4m6 4h-4a2 2 0 1 0 0 4h4a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1Z"
                        />
                    </svg>
                    <span className="text-sm text-gray-400 group-hover:text-gray-200">
                        Bag
                    </span>
                </Link>

                <Link
                    href="/dashboard"
                    className="inline-flex flex-col items-center justify-center px-8 hover:bg-gray-900 group"
                >
                    <svg
                        className="w-6 h-6 mb-1 text-gray-400 group-hover:text-gray-200"
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="m4 12 8-8 8 8M6 10.5V19a1 1 0 0 0 1 1h3v-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3h3a1 1 0 0 0 1-1v-8.5"
                        />
                    </svg>
                    <span className="text-sm text-gray-400 group-hover:text-gray-200">
                        Home
                    </span>
                </Link>

                <Link
                    href="/dashboard/profile"
                    className="inline-flex flex-col items-center justify-center px-8 hover:bg-gray-900 group"
                >
                    <svg
                        className="w-6 h-6 mb-1 text-gray-400 group-hover:text-gray-200"
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0a8.949 8.949 0 0 0 4.951-1.488A3.987 3.987 0 0 0 13 16h-2a3.987 3.987 0 0 0-3.951 3.512A8.948 8.948 0 0 0 12 21Zm3-11a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                        />
                    </svg>
                    <span className="text-sm text-gray-400 group-hover:text-gray-200">
                        Profile
                    </span>
                </Link>

                <Link
                    href="/dashboard/settings"
                    className="inline-flex flex-col items-center justify-center px-8 hover:bg-gray-900 group"
                >
                    <svg
                        className="w-6 h-6 mb-1 text-gray-400 group-hover:text-gray-200"
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeWidth="2"
                            d="M6 4v10m0 0a2 2 0 1 0 0 4m0-4a2 2 0 1 1 0 4m0 0v2m6-16v2m0 0a2 2 0 1 0 0 4m0-4a2 2 0 1 1 0 4m0 0v10m6-16v10m0 0a2 2 0 1 0 0 4m0-4a2 2 0 1 1 0 4m0 0v2"
                        />
                    </svg>
                    <span className="text-sm text-gray-400 group-hover:text-gray-200">
                        Settings
                    </span>
                </Link>
            </div>
        </div>
    )
}
