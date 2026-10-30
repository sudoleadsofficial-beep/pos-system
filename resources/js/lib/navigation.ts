import { NavGroup, NavItem } from "@/types";

export const jkcSidebarNav: NavGroup[] = [
    {
        id: "home",
        title: "nav.home",
        icon: "HouseIcon",
        isGroup: true,
        items: [
            {
                title: "nav.dashboard",
                url: "/dashboard",
                icon: "ChartPieSliceIcon",
            },
        ],
        includeRoutes: ["dashboard"]
    },
    {
        id: "merchants",
        title: "nav.merchant_side",
        icon: "UsersIcon",
        isGroup: true,
        items: [
            {
                title: "nav.amroza",
                url: "/amroza",
                icon: "TagIcon",
            },
            {
                title: "nav.naqdi",
                url: "/naqdi",
                icon: "CoinsIcon",
            },
            {
                title: "nav.wasooli",
                url: "/wasooli",
                icon: "HandCoinsIcon",
            },
            {
                title: "nav.merchant_amroza",
                url: "/merchant-amroza",
                icon: "CalendarDotsIcon",
            },
            {
                title: "nav.merchant_wasooli",
                url: "/merchant-wasooli",
                icon: "ClockCountdownIcon",
            },
            {
                title: "nav.amroza_detail",
                url: "/amroza-detail",
                icon: "ListBulletsIcon",
            },
            {
                title: "nav.wasooli_detail",
                url: "/wasooli-detail",
                icon: "ListChecksIcon",
            },
            {
                title: "nav.amroza_wasooli",
                url: "/amroza-wasooli",
                icon: "ArrowsLeftRightIcon",
            },
        ],
        includeRoutes: [
            "amroza",
            "naqdi",
            "wasooli",
            "merchant-amroza",
            "merchant-wasooli",
            "amroza-detail",
            "wasooli-detail",
            "amroza-wasooli"
        ]
    },
    {
        id: "farmers",
        title: "nav.farmer_side",
        icon: "TruckIcon",
        isGroup: true,
        items: [
            {
                title: "nav.register",
                url: "/register-consignment",
                icon: "TruckIcon",
            },
            {
                title: "nav.bijak",
                url: "/bijak",
                icon: "ReceiptXIcon",
            },
            {
                title: "nav.general_bill",
                url: "/general-bill",
                icon: "FileTextIcon",
            },
            {
                title: "nav.khata",
                url: "/khata",
                icon: "BookOpenIcon",
            },
            {
                title: "nav.bari_detail",
                url: "/bari-detail",
                icon: "BookmarksIcon",
            },
            {
                title: "nav.bari_jama_banam",
                url: "/bari-jama-banam",
                icon: "ChartLineUpIcon",
            },
            {
                title: "nav.khata_index",
                url: "/khata-index",
                icon: "ListNumbersIcon",
            },
        ],
        includeRoutes: [
            "register",
            "bijak",
            "general-bill",
            "khata",
            "bari-detail",
            "bari-jama-banam",
            "khata-index"
        ]
    },
    {
        id: "cash_book",
        title: "nav.cash_book",
        icon: "BookBookmarkIcon",
        isGroup: true,
        items: [
            {
                title: "nav.general_ledger",
                url: "/general-ledger",
                icon: "BookBookmarkIcon",
            },
        ],
        includeRoutes: ["general-ledger"]
    },
    {
        id: "masters",
        title: "nav.masters",
        icon: "DatabaseIcon",
        isGroup: true,
        items: [
            {
                title: "nav.merchants",
                url: "/masters/merchants",
                icon: "UsersIcon",
            },
            {
                title: "nav.farmers",
                url: "/masters/farmers",
                icon: "UserCircleIcon",
            },
            {
                title: "nav.marks",
                url: "/masters/marks",
                icon: "BookmarksIcon",
            },
            {
                title: "nav.items",
                url: "/masters/items",
                icon: "PackageIcon",
            },
            {
                title: "nav.areas",
                url: "/masters/areas",
                icon: "MapPinIcon",
            },
        ],
        includeRoutes: [
            "merchants",
            "farmers",
            "marks",
            "items",
            "areas"
        ]
    },
    {
        id: "reports",
        title: "nav.reports",
        icon: "PrinterIcon",
        isGroup: true,
        items: [
            {
                title: "nav.reports",
                url: "/reports",
                icon: "PrinterIcon",
            },
        ],
        includeRoutes: ["reports"]
    },
    {
        id: "system",
        title: "nav.system",
        icon: "GearIcon",
        isGroup: true,
        items: [
            {
                title: "nav.settings",
                url: "/settings/currency",
                icon: "GearIcon",
            },
            {
                title: "nav.backup",
                url: "/backup",
                icon: "CloudArrowUpIcon",
            },
            {
                title: "nav.users",
                url: "/users",
                icon: "UserGearIcon",
            },
        ],
        includeRoutes: [
            "settings",
            "backup",
            "users"
        ]
    }
];

const legacySidebarNav: NavGroup[] = [
    {
        id: "legacy_pos",
        title: "Legacy POS",
        icon: "CashRegisterIcon",
        isGroup: true,
        items: [
            { title: "POS", icon: "CashRegisterIcon", url: "/pos" },
            { title: "Purchases", icon: "CoinsIcon", url: "/purchases" },
            { title: "Sales", icon: "TagIcon", url: "/sales" },
            { title: "Expenses", icon: "ReceiptXIcon", url: "/expenses" },
            { title: "Products", icon: "PackageIcon", url: "/products" },
            { title: "Categories", icon: "FolderIcon", url: "/categories" },
            { title: "Customers", icon: "UsersIcon", url: "/customers" },
            { title: "Employees", icon: "IdentificationBadgeIcon", url: "/employees" },
        ],
        includeRoutes: ["pos", "purchases", "sales", "expenses", "products", "categories", "customers", "employees"]
    }
];

const footerNav: NavItem[] = [
    {
        title: "nav.support",
        url: "/help",
        icon: "QuestionIcon",
    },
    {
        title: "nav.live_chat",
        url: "/live-chat",
        icon: "ChatsIcon"
    }
];

export const getNavigationItems = (showLegacyPos = false) => {
    return {
        sideNav: showLegacyPos ? [...jkcSidebarNav, ...legacySidebarNav] : [...jkcSidebarNav],
        footerNav: [...footerNav],
    };
};

export const navigationItems = getNavigationItems(false);
