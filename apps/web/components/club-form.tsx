"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";

const clubSchema = z.object({
  name: z.string().min(1, "Club name is required").max(255),
  defaultMaxPlayers: z.coerce.number().int().min(1).default(20),
  defaultShuttlecockFee: z.coerce.number().int().min(0).default(0),
  defaultCourtFee: z.coerce.number().int().min(0).default(0),
});

type ClubFormData = z.infer<typeof clubSchema>;

interface ClubFormProps {
  defaultValues?: Partial<ClubFormData>;
  onSubmit: (data: ClubFormData) => Promise<void>;
  submitLabel: string;
  title: string;
}

export function ClubForm({
  defaultValues,
  onSubmit,
  submitLabel,
  title,
}: ClubFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClubFormData>({
    resolver: zodResolver(clubSchema),
    defaultValues: {
      name: "",
      defaultMaxPlayers: 20,
      defaultShuttlecockFee: 0,
      defaultCourtFee: 0,
      ...defaultValues,
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Club Name</Label>
            <Input
              id="name"
              placeholder="e.g., Saturday Smashers"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultMaxPlayers">Default Max Players</Label>
            <Input
              id="defaultMaxPlayers"
              type="number"
              min={1}
              {...register("defaultMaxPlayers")}
            />
            {errors.defaultMaxPlayers && (
              <p className="text-sm text-destructive">
                {errors.defaultMaxPlayers.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultShuttlecockFee">
              Default Shuttlecock Fee (Baht)
            </Label>
            <Input
              id="defaultShuttlecockFee"
              type="number"
              min={0}
              {...register("defaultShuttlecockFee")}
            />
            {errors.defaultShuttlecockFee && (
              <p className="text-sm text-destructive">
                {errors.defaultShuttlecockFee.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultCourtFee">Default Court Fee (Baht)</Label>
            <Input
              id="defaultCourtFee"
              type="number"
              min={0}
              {...register("defaultCourtFee")}
            />
            {errors.defaultCourtFee && (
              <p className="text-sm text-destructive">
                {errors.defaultCourtFee.message}
              </p>
            )}
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : submitLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
