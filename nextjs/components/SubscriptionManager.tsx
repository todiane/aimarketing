"use client";

import React, { useEffect, useState } from "react";
import Stripe from "stripe";
import { Button } from "./ui/button";
import { Box, LayoutTemplate, Star } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter, useSearchParams } from "next/navigation";

interface SubscriptionManagerProps {
  subscription: Stripe.Subscription | null;
}

function SubscriptionManager({ subscription }: SubscriptionManagerProps) {
  const [isMounted, setIsMounted] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  console.log("Subscription", subscription);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");

    if (success === "true") {
      toast.success("Subscription successful! Welcome aboard!", {
        duration: 5000,
      });
      console.log("Subscription successful! Welcome aboard!");
      router.replace("/settings"); // Replace to remove query parameters
    } else if (canceled === "true") {
      toast.error(
        "Subscription canceled. If you change your mind, feel free to subscribe later!"
      );
      router.replace("/settings"); // Replace to remove query parameters
    }
  }, [searchParams, router, isMounted]);

  return (
    <div className="space-y-6 sm:space-y-6 lg:space-y-10">
      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
        Subscription Settings
      </h1>
      <SubscriptionBody subscription={subscription} />
    </div>
  );
}

export default SubscriptionManager;

function SubscriptionBody({
  subscription,
}: {
  subscription: Stripe.Subscription | null;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  const handleCheckout = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const { url } = await response.json();
      router.push(url);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to initiate checkout. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to create portal session");
      }

      const { url } = await response.json();
      router.push(url);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to open subscription management. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (subscription && subscription.status === "active") {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="space-y-2 sm:space-y-6">
          <h3 className="text-lg sm:text-xl font-semibold">Your Plan</h3>
          <p className="text-sm sm:text-base text-muted-foreground">
            Status: {getSubscriptionStatus(subscription)}
          </p>
          <p className="text-sm sm:text-base text-muted-foreground">
            {subscription.cancel_at
              ? `Access until: ${formatDate(subscription.current_period_end)}`
              : `Next billing date: ${formatDate(
                  subscription.current_period_end
                )}`}
          </p>
        </div>
        <Button
          onClick={handleManageSubscription}
          className="w-full sm:w-auto bg-green-100 text-green-600 border-2 border-green-200 hover:bg-green-200 hover:border-green-300"
          disabled={isLoading}
        >
          {isLoading ? "Processing..." : "Manage Subscription"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="space-y-2 sm:space-y-3">
        <h3 className="text-lg sm:text-xl font-semibold">Your Plan</h3>
        <p className="text-sm sm:text-base text-muted-foreground">
          You are using a Free plan.
        </p>
      </div>
      <div className="space-y-4 sm:space-y-6">
        <h3 className="text-lg sm:text-xl font-semibold">
          Subscription Features
        </h3>
        <ul className="space-y-3 sm:space-y-4">
          <li className="flex items-center space-x-3">
            <Star className="w-5 h-5 text-main flex-shrink-0" />
            <span className="text-sm sm:text-base">Unlimited Projects</span>
          </li>
          <li className="flex items-center space-x-3">
            <LayoutTemplate className="w-5 h-5 text-main flex-shrink-0" />
            <span className="text-sm sm:text-base">Unlimited Templates</span>
          </li>
          <li className="flex items-center space-x-3">
            <Box className="w-5 h-5 text-main flex-shrink-0" />
            <span className="text-sm sm:text-base">Unlimited Storage</span>
          </li>
        </ul>
        <Button
          onClick={handleCheckout}
          disabled={isLoading}
          className="w-full sm:w-auto mt-4 sm:mt-6"
        >
          {isLoading ? "Processing..." : "Subscribe Now - $14.99"}
        </Button>
      </div>
    </div>
  );
}

const getSubscriptionStatus = (
  subscription: Stripe.Subscription | null
): string => {
  if (!subscription) return "No active subscription";
  if (subscription.status === "active" && subscription.cancel_at) {
    return "Canceled (Access until end of billing period)";
  }
  return (
    subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)
  );
};

function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
