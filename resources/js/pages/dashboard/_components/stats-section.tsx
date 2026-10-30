import { useTranslation } from "react-i18next";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { formattedNumber } from "@/lib/utils";
import Icon from "@/components/ui/icon";

type DashboardStatsProps = {
    stats?: {
        todaysSale?: number;
        cashSale?: number;
        creditSale?: number;
        received?: number;
        merchantsBalance?: number;
        cashInHand?: number;
        farmersBalance?: number;
    };
};

export function DashboardStats({ stats = {} }: DashboardStatsProps) {
    const { t, i18n } = useTranslation();
    const isUrdu = i18n.language === 'ur';

    const cards = [
        {
            title: t("dashboard.todays_sale"),
            value: stats.todaysSale ?? 0,
            icon: "TagIcon" as const,
            color: "text-blue-600",
            bg: "bg-blue-50 dark:bg-blue-950/40",
        },
        {
            title: t("dashboard.cash_sale"),
            value: stats.cashSale ?? 0,
            icon: "CoinsIcon" as const,
            color: "text-emerald-600",
            bg: "bg-emerald-50 dark:bg-emerald-950/40",
        },
        {
            title: t("dashboard.credit_sale"),
            value: stats.creditSale ?? 0,
            icon: "ReceiptXIcon" as const,
            color: "text-amber-600",
            bg: "bg-amber-50 dark:bg-amber-950/40",
        },
        {
            title: t("dashboard.received"),
            value: stats.received ?? 0,
            icon: "HandCoinsIcon" as const,
            color: "text-teal-600",
            bg: "bg-teal-50 dark:bg-teal-950/40",
        },
        {
            title: t("dashboard.merchants_balance"),
            value: stats.merchantsBalance ?? 0,
            icon: "UsersIcon" as const,
            color: "text-indigo-600",
            bg: "bg-indigo-50 dark:bg-indigo-950/40",
        },
        {
            title: t("dashboard.cash_in_hand"),
            value: stats.cashInHand ?? 0,
            icon: "WalletIcon" as const,
            color: "text-purple-600",
            bg: "bg-purple-50 dark:bg-purple-950/40",
        },
        {
            title: t("dashboard.farmers_balance"),
            value: stats.farmersBalance ?? 0,
            icon: "TruckIcon" as const,
            color: "text-rose-600",
            bg: "bg-rose-50 dark:bg-rose-950/40",
        },
    ];

    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((card, idx) => (
                <Card key={idx} className="rounded-xl border shadow-xs hover:shadow-sm transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className={`text-xs font-semibold text-muted-foreground ${isUrdu ? 'font-nastaliq text-sm' : ''}`}>
                            {card.title}
                        </CardTitle>
                        <div className={`p-2 rounded-lg ${card.bg}`}>
                            <Icon name={card.icon} className={`size-4 ${card.color}`} weight="duotone" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold tracking-tight text-foreground">
                            {formattedNumber(card.value, "Rs")}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

export default DashboardStats;
