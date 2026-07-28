import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function GoalCard() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>🏆 Objetivo Atual</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold">
            Pokédex Full Art
          </h3>

          <p className="text-sm text-gray-500">
            0 de 215 cartas
          </p>
        </div>

        <Progress value={0} />

        <p className="text-right text-sm font-semibold">
          0%
        </p>
      </CardContent>
    </Card>
  );
}