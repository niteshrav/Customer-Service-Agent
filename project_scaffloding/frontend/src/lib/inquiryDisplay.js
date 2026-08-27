/**
 * Derived display labels for inquiries (maps existing open/resolved + workflow flags).
 */
export function getInquiryDisplayStatus(inq) {
  if (!inq) return { key: "unknown", label: "Unknown", tone: "neutral" };
  if (inq.status === "resolved") return { key: "resolved", label: "Resolved", tone: "success" };
  if (inq.issue_addressed && !inq.customer_approved) {
    return { key: "awaiting_approval", label: "Awaiting approval", tone: "warning" };
  }
  if (inq.issue_identified && !inq.issue_addressed) {
    return { key: "in_progress", label: "In progress", tone: "info" };
  }
  if (!inq.accessible) return { key: "pending", label: "Pending", tone: "neutral" };
  return { key: "open", label: "Open", tone: "open" };
}

export function formatTs(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(iso);
  }
}
