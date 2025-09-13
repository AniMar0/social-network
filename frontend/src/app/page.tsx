"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthForm } from "@/components/auth";

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Add storage event listener for logout handling
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "logout") {
        window.location.reload();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    const checkLogin = async () => {
      try {
        const res = await fetch("http://localhost:8080/api/logged", {
          method: "POST",
          credentials: "include",
        });

        if (!res.ok) {
          const text = await res.text();
          console.log("Error checking login status:", text);
          setLoading(false);
          return;
        }

        const data = await res.json();
        if (data.loggedIn) {
          // User is logged in, redirect to home
          router.push("/home");
        } else {
          // User not logged in, stay on auth page
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching login:", err);
        setLoading(false);
      }
    };

    checkLogin();

    // Cleanup event listener on component unmount
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AuthForm />
    </div>
  );
}
