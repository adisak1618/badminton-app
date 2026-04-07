"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Card, CardContent } from "@repo/ui/components/card";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@repo/ui/components/select";

const profileSchema = z.object({
  displayName: z.string().min(1, "Display name is required").max(255),
  skillLevel: z.enum(["beginner", "intermediate", "advanced", "competitive"], {
    error: "Please select your skill level",
  }),
  yearsPlaying: z
    .number({ error: "Please enter a number of 0 or more" })
    .int()
    .min(0, "Please enter a number of 0 or more"),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  defaultValues?: Partial<ProfileFormData>;
  onSubmit: (data: ProfileFormData) => Promise<void>;
  submitLabel: string;
}

export function ProfileForm({ defaultValues, onSubmit, submitLabel }: ProfileFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
      skillLevel: undefined,
      yearsPlaying: 0,
      ...defaultValues,
    },
  });

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              {...register("displayName")}
              aria-describedby={errors.displayName ? "displayName-error" : undefined}
            />
            {errors.displayName && (
              <p id="displayName-error" className="text-sm text-destructive">
                {errors.displayName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="skillLevel">Skill Level</Label>
            <Select
              defaultValue={defaultValues?.skillLevel}
              onValueChange={(value) =>
                setValue("skillLevel", value as ProfileFormData["skillLevel"], {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger
                id="skillLevel"
                aria-describedby={errors.skillLevel ? "skillLevel-error" : undefined}
              >
                <SelectValue placeholder="Select your skill level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
                <SelectItem value="competitive">Competitive</SelectItem>
              </SelectContent>
            </Select>
            {errors.skillLevel && (
              <p id="skillLevel-error" className="text-sm text-destructive">
                {errors.skillLevel.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="yearsPlaying">Years Playing Badminton</Label>
            <Input
              id="yearsPlaying"
              type="number"
              min={0}
              {...register("yearsPlaying", { valueAsNumber: true })}
              aria-describedby={errors.yearsPlaying ? "yearsPlaying-error" : undefined}
            />
            {errors.yearsPlaying && (
              <p id="yearsPlaying-error" className="text-sm text-destructive">
                {errors.yearsPlaying.message}
              </p>
            )}
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full min-h-[44px]">
            {isSubmitting ? "Saving..." : submitLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
