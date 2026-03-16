"use client";

import { useEffect, useState } from "react";

export default function DisclaimerModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasSeen = localStorage.getItem("mosport_disclaimer_seen");
    if (!hasSeen) {
      setIsOpen(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("mosport_disclaimer_seen", "true");
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-panel max-w-md rounded-xl p-6 border border-grid shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-4">Legal Disclaimer</h2>
        <div className="text-secondary-text mb-6 space-y-4">
          <p>
            This platform provides statistical insights only.
          </p>
          <p>
            The information does not constitute financial or betting advice.
          </p>
        </div>
        <button
          onClick={handleAccept}
          className="w-full h-[44px] rounded-lg bg-signal-blue hover:bg-blue-600 text-white font-semibold transition-colors"
        >
          I Understand
        </button>
      </div>
    </div>
  );
}
