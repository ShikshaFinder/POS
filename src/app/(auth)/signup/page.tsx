"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { FcGoogle } from "react-icons/fc";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const signupSchema = z.object({
  name: z
    .string()
    .min(2, "Name must have at least 2 characters.")
    .max(60, "Name must be shorter than 60 characters.")
    .optional(),
  email: z.string().email("Please enter a valid email."),
  password: z.string().min(8, "Passwords must be at least 8 characters."),
});

type SignupValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: undefined,
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: SignupValues) => {
    setServerMessage(null);
    setServerError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await response.json();

      if (!response.ok) {
        setServerError(data.error ?? "Unable to create your account.");
        return;
      }

      setServerMessage(
        data.message ??
          "Account created. Check your email for the verification link."
      );
      form.reset({
        name: undefined,
        email: "",
        password: "",
      });
    } catch (error) {
      console.error(error);
      setServerError("Unexpected error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setServerMessage(null);
    setServerError(null);
    await signIn("google", { callbackUrl: "/" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#0f172a,_#020617)] px-4 py-12 text-white">
      <Card className="w-full max-w-md border-slate-800/70 bg-slate-950/60 text-white backdrop-blur">
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
          <CardDescription className="text-slate-400">
            We will send you a verification email as soon as you register.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name (optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        onChange={(event) =>
                          field.onChange(
                            event.target.value.length ? event.target.value : undefined
                          )
                        }
                        placeholder="Alicia Keys"
                        className="bg-slate-900/60"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        autoComplete="email"
                        placeholder="noreply@flavidairysolution.com"
                        className="bg-slate-900/60"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        autoComplete="new-password"
                        placeholder="••••••••"
                        className="bg-slate-900/60"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create account
              </Button>
            </form>
          </Form>

          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <span className="h-px flex-1 bg-slate-800" />
              <span className="text-xs uppercase tracking-widest text-slate-500">
                or
              </span>
              <span className="h-px flex-1 bg-slate-800" />
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full border-slate-700 bg-transparent text-white hover:bg-slate-900"
              onClick={handleGoogleSignUp}
            >
              <FcGoogle className="mr-2 h-5 w-5" />
              Continue with Google
            </Button>
          </div>

          {serverMessage && (
            <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
              {serverMessage}
            </p>
          )}

          {serverError && (
            <p className="rounded-md bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
              {serverError}
            </p>
          )}

          <p className="text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link
              href="/signin"
              className="font-medium text-white underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

