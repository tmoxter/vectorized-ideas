"use client";

import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import { Trash2, AlertTriangle } from "lucide-react";
import { Circles } from 'react-loader-spinner';

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [message, setMessage] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const router = useRouter();
  const supabase = supabaseClient();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      router.push("/");
      return;
    }
    setUser(session.user);
    setIsLoading(false);
  };

  const handleDeleteAccount = async () => {
    if (confirmText !== "DELETE") {
      setDeleteError('Please type "DELETE" to confirm');
      return;
    }

    setIsDeleting(true);
    setDeleteError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      // Call API to delete user account
      const response = await fetch("/api/delete-account", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        setMessage("Account deleted successfully. Redirecting...");
        // Sign out and redirect
        await supabase.auth.signOut();
        setTimeout(() => {
          router.push("/");
        }, 2000);
      } else {
        const errorData = await response.json();
        setDeleteError(errorData.error || "Failed to delete account");
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      setDeleteError("An unexpected error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Circles color="#111827" width="24" height="24" visible={true} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation
        currentPage="settings"
        userEmail={user?.email}
        onLogout={handleLogout}
      />

      <main className="px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-mono font-bold text-gray-900 mb-2">
              Account Settings
            </h1>
            <p className="font-mono text-gray-600 text-sm">
              Manage your account preferences and data
            </p>
          </div>

          {message && (
            <div className="mb-6 p-4 bg-green-50 text-green-700 border border-green-200 rounded font-mono text-sm">
              {message}
            </div>
          )}

          {/* Account Information */}
          <section className="bg-white p-6 rounded border border-gray-200 mb-6">
            <h2 className="text-xl font-mono font-bold text-gray-900 mb-4">
              Account Information
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block font-mono text-sm text-gray-600 mb-1">
                  Email
                </label>
                <div className="font-mono text-gray-900">{user?.email}</div>
              </div>
              <div>
                <label className="block font-mono text-sm text-gray-600 mb-1">
                  User ID
                </label>
                <div className="font-mono text-xs text-gray-500 break-all">
                  {user?.id}
                </div>
              </div>
            </div>
          </section>

          {/* Danger Zone */}
          <section className="bg-white p-6 rounded border border-red-200">
            <div className="flex items-start space-x-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-xl font-mono font-bold text-red-600 mb-1">
                  Danger Zone
                </h2>
                <p className="font-mono text-sm text-gray-600">
                  Irreversible and destructive actions
                </p>
              </div>
            </div>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center space-x-2 px-6 py-3 border border-red-300 bg-red-50 text-red-700 rounded font-mono text-sm hover:bg-red-100 transition duration-200"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Account</span>
              </button>
            ) : (
              <div className="border-t border-red-200 pt-6 mt-6">
                <h3 className="text-lg font-mono font-bold text-gray-900 mb-3">
                  Confirm Account Deletion
                </h3>
                <div className="bg-red-50 p-4 rounded border border-red-200 mb-4">
                  <p className="font-mono text-sm text-red-800 mb-2">
                    <strong>Warning:</strong> This action cannot be undone.
                  </p>
                  <ul className="list-disc list-inside font-mono text-sm text-red-700 space-y-1">
                    <li>Your profile and venture ideas will be deleted</li>
                    <li>All your matches and interactions will be removed</li>
                    <li>You will be logged out immediately</li>
                  </ul>
                </div>

                <div className="mb-4">
                  <label className="block font-mono text-sm text-gray-700 mb-2">
                    Type <strong>DELETE</strong> to confirm:
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => {
                      setConfirmText(e.target.value);
                      setDeleteError("");
                    }}
                    placeholder="DELETE"
                    className="w-full px-4 py-3 border border-gray-300 rounded font-mono text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  />
                  {deleteError && (
                    <p className="mt-2 font-mono text-sm text-red-600">
                      {deleteError}
                    </p>
                  )}
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={isDeleting || confirmText !== "DELETE"}
                    className="px-6 py-3 bg-red-600 text-white rounded font-mono text-sm hover:bg-red-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDeleting ? "Deleting..." : "Delete My Account"}
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setConfirmText("");
                      setDeleteError("");
                    }}
                    disabled={isDeleting}
                    className="px-6 py-3 border border-gray-300 rounded font-mono text-sm hover:bg-gray-50 transition duration-200 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
