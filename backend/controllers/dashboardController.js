import Booking from "../models/Booking.js";
import Contact from "../models/Contact.js";
import Conversation from "../models/Conversation.js";
import FormSubmission from "../models/FormSubmission.js";
import InventoryItem from "../models/InventoryItem.js";
import Workspace from "../models/Workspace.js";

export const getDashboardOverview = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ success: false, message: "Workspace not found" });
    }

    const isOwner = workspace.owner.toString() === req.user.id;
    const isStaff = req.user.workspaces.some(
      (ws) => ws.workspace.toString() === workspaceId,
    );

    if (!isOwner && !isStaff) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    await FormSubmission.updateMany(
      { workspace: workspaceId, status: "pending", dueAt: { $lt: new Date() } },
      { $set: { status: "overdue" } },
    );

    const [
      todaysBookings,
      upcomingBookings,
      completedCount,
      noShowCount,
      newLeads,
      ongoingConversations,
      unansweredMessages,
      pendingForms,
      overdueForms,
      completedForms,
      lowStockItems,
      criticalItems,
      unconfirmedBookings,
    ] = await Promise.all([
      Booking.countDocuments({
        workspace: workspaceId,
        bookingDate: { $gte: startOfToday, $lt: endOfToday },
      }),
      Booking.countDocuments({
        workspace: workspaceId,
        bookingDate: { $gte: endOfToday },
        status: { $in: ["confirmed", "completed"] },
      }),
      Booking.countDocuments({ workspace: workspaceId, status: "completed" }),
      Booking.countDocuments({ workspace: workspaceId, status: "no-show" }),
      Contact.countDocuments({ workspace: workspaceId, status: "new" }),
      Conversation.countDocuments({ workspace: workspaceId, status: "open" }),
      Conversation.countDocuments({ workspace: workspaceId, unreadCount: { $gt: 0 } }),
      FormSubmission.countDocuments({ workspace: workspaceId, status: "pending" }),
      FormSubmission.countDocuments({ workspace: workspaceId, status: "overdue" }),
      FormSubmission.countDocuments({ workspace: workspaceId, status: "completed" }),
      InventoryItem.find({
        workspace: workspaceId,
        isActive: true,
        $expr: { $lte: ["$quantity", "$lowStockThreshold"] },
      })
        .select("name quantity lowStockThreshold unit")
        .sort({ quantity: 1 })
        .limit(10),
      InventoryItem.countDocuments({
        workspace: workspaceId,
        isActive: true,
        quantity: { $lte: 0 },
      }),
      Booking.countDocuments({
        workspace: workspaceId,
        status: "confirmed",
        bookingDate: { $lt: startOfToday },
      }),
    ]);

    const alerts = [];

    if (unansweredMessages > 0) {
      alerts.push({
        type: "messages",
        label: `${unansweredMessages} conversations have unread messages`,
        link: "/dashboard/inbox",
      });
    }

    if (unconfirmedBookings > 0) {
      alerts.push({
        type: "bookings",
        label: `${unconfirmedBookings} past bookings are still unconfirmed/completion pending`,
        link: "/dashboard/bookings",
      });
    }

    if (overdueForms > 0) {
      alerts.push({
        type: "forms",
        label: `${overdueForms} forms are overdue`,
        link: "/dashboard/forms",
      });
    }

    if (lowStockItems.length > 0) {
      alerts.push({
        type: "inventory",
        label: `${lowStockItems.length} inventory items are low`,
        link: "/dashboard/inventory",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        bookingOverview: {
          todaysBookings,
          upcomingBookings,
          completedCount,
          noShowCount,
        },
        leadsAndConversations: {
          newLeads,
          ongoingConversations,
          unansweredMessages,
        },
        formsStatus: {
          pendingForms,
          overdueForms,
          completedForms,
        },
        inventory: {
          lowStockItems,
          criticalItems,
        },
        alerts,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
