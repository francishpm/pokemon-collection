import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
    title: string;
    value: string;
    icon: string;
}

export function StatCard({
    title,
    value,
    icon,
}: StatCardProps) {
    return (
        <Card className="shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
            <CardContent className="flex items-center justify-between p-6">

<div>
  <p className="text-sm text-gray-500">
    {title}
  </p>

  <h2 className="mt-2 text-3xl font-bold">
    {value}
  </h2>
</div>

<div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 text-3xl">
  {icon}
</div>

            </CardContent>
        </Card>
    );
}