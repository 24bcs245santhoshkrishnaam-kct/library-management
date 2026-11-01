import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

/**
 * Live Countdown Timer for KCT AI Smart Library (Feature 2 & 3)
 * Displays live remaining time synchronized with server database due timestamp:
 * - 6-Day Production Mode: "6 days remaining", "5 days 14h left", etc.
 * - 10-Minute Testing Mode: Live ticking "MM:SS remaining" (e.g. "09:45 remaining").
 * - Overdue: Immediately changes to "Overdue" when countdown reaches zero.
 * - Stopped when status is Returned.
 * - Immune to page refreshes or logouts (calculates against exact database timestamp).
 */
export default function CountdownTimer({ 
  dueDate, 
  dueDateTimestamp, 
  status, 
  isOverdue = false,
  showIcon = true,
  className = ''
}) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    // If loan is returned, timer is frozen
    if (status === 'Returned') return;

    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [status]);

  if (status === 'Returned') {
    return (
      <span className={`badge bg-success-subtle text-success px-2.5 py-1 rounded-pill small fw-semibold d-inline-flex align-items-center gap-1 ${className}`}>
        {showIcon && <CheckCircle2 size={12} />}
        <span>Returned (Completed)</span>
      </span>
    );
  }

  // Parse due timestamp safely
  let targetTimeMs = dueDateTimestamp;
  if (!targetTimeMs && dueDate) {
    targetTimeMs = new Date(dueDate).getTime();
  }

  if (!targetTimeMs || isNaN(targetTimeMs)) {
    return <span className="text-muted small">N/A</span>;
  }

  const diffMs = targetTimeMs - now;

  // Overdue status reached
  if (diffMs <= 0 || isOverdue) {
    const overdueMs = Math.abs(diffMs);
    const overdueMins = Math.floor(overdueMs / 60000);
    const overdueHours = Math.floor(overdueMs / 3600000);
    const overdueDays = Math.floor(overdueMs / 86400000);

    let overdueText = 'Overdue';
    if (overdueDays > 0) {
      overdueText = `${overdueDays}d overdue`;
    } else if (overdueHours > 0) {
      overdueText = `${overdueHours}h overdue`;
    } else {
      overdueText = `${Math.max(1, overdueMins)}m overdue`;
    }

    return (
      <span className={`badge bg-danger text-white px-2.5 py-1 rounded-pill small fw-bold d-inline-flex align-items-center gap-1 shadow-xs ${className}`}>
        {showIcon && <AlertTriangle size={12} />}
        <span>{overdueText.toUpperCase()}</span>
      </span>
    );
  }

  // Active unoverdue loan countdown
  const diffSecs = Math.floor(diffMs / 1000);
  const days = Math.floor(diffSecs / 86400);
  const hours = Math.floor((diffSecs % 86400) / 3600);
  const mins = Math.floor((diffSecs % 3600) / 60);
  const secs = diffSecs % 60;

  // 1. Under 1 hour (Testing Mode 10m or final hour countdown)
  if (diffMs < 3600000) {
    const mm = String(mins).padStart(2, '0');
    const ss = String(secs).padStart(2, '0');
    const isCritical = mins < 2;

    return (
      <span 
        className={`badge ${
          isCritical ? 'bg-danger text-white' : 'bg-warning-subtle text-dark border border-warning'
        } px-2.5 py-1 rounded-pill small fw-bold font-monospace d-inline-flex align-items-center gap-1 shadow-xs ${className}`}
        title={`Due at: ${dueDate || new Date(targetTimeMs).toLocaleString()}`}
      >
        {showIcon && <Clock size={12} className={isCritical ? 'animate-pulse' : ''} />}
        <span>{mm}:{ss} remaining</span>
      </span>
    );
  }

  // 2. Between 1 hour and 24 hours
  if (diffMs < 86400000) {
    return (
      <span 
        className={`badge bg-warning-subtle text-dark border border-warning px-2.5 py-1 rounded-pill small fw-semibold font-monospace d-inline-flex align-items-center gap-1 ${className}`}
        title={`Due at: ${dueDate || new Date(targetTimeMs).toLocaleString()}`}
      >
        {showIcon && <Clock size={12} />}
        <span>{hours}h {mins}m {secs}s left</span>
      </span>
    );
  }

  // 3. 24+ hours (Standard 6-Day Borrowing Period)
  return (
    <span 
      className={`badge bg-teal-50 text-teal-700 border border-teal-200 px-2.5 py-1 rounded-pill small fw-semibold d-inline-flex align-items-center gap-1 ${className}`}
      title={`Due at: ${dueDate || new Date(targetTimeMs).toLocaleString()}`}
    >
      {showIcon && <Clock size={12} />}
      <span>{days} day{days === 1 ? '' : 's'}{hours > 0 ? ` ${hours}h` : ''} remaining</span>
    </span>
  );
}

