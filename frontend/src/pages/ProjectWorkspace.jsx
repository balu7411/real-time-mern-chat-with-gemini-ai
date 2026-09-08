import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";

import api from "../api/axios";
import { useAuth } from "../context/AuthContext.jsx";

import ChatWindow from "../components/ChatWindow.jsx";
import FileExplorer from "../components/FileExplorer.jsx";
import CodeViewer from "../components/CodeViewer.jsx";
import AddCollaboratorModal from "../components/AddCollaboratorModal.jsx";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  "http://localhost:5000";

function getToken() {
  return (
    sessionStorage.getItem("token") ||
    localStorage.getItem("token")
  );
}

function getId(value) {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  return (
    value._id?.toString() ||
    value.id?.toString() ||
    value.toString?.() ||
    ""
  );
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function priorityClass(priority) {
  switch (priority) {
    case "Critical":
      return "bg-red-500/15 text-red-300 border-red-500/30";

    case "High":
      return "bg-orange-500/15 text-orange-300 border-orange-500/30";

    case "Low":
      return "bg-gray-500/15 text-gray-300 border-gray-500/30";

    default:
      return "bg-blue-500/15 text-blue-300 border-blue-500/30";
  }
}

function to24Hour(time, period) {
  if (!time) return "";

  const [hourText, minuteText] = time.split(":");
  let hour = Number(hourText);

  if (!Number.isInteger(hour) || !minuteText) {
    return "";
  }

  if (period === "AM") {
    if (hour === 12) hour = 0;
  } else {
    if (hour !== 12) hour += 12;
  }

  return `${String(hour).padStart(2, "0")}:${minuteText}`;
}

function statusClass(status) {
  switch (status) {
    case "Done":
    case "Completed":
      return "bg-green-500/15 text-green-300 border-green-500/30";

    case "In Progress":
      return "bg-blue-500/15 text-blue-300 border-blue-500/30";

    case "Review":
      return "bg-purple-500/15 text-purple-300 border-purple-500/30";

    case "Rejected":
      return "bg-red-500/15 text-red-300 border-red-500/30";

    default:
      return "bg-yellow-500/15 text-yellow-300 border-yellow-500/30";
  }
}

export default function ProjectWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState(null);

  const [messages, setMessages] = useState([]);
  const [files, setFiles] = useState([]);
  const [activePath, setActivePath] = useState(null);

  const [socket, setSocket] = useState(null);
  const [aiThinking, setAiThinking] = useState(false);

  const [showCollabModal, setShowCollabModal] =
    useState(false);

  const [activeTab, setActiveTab] =
    useState("overview");

  const [tasks, setTasks] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [clientRequests, setClientRequests] =
    useState([]);

  const [loadingData, setLoadingData] =
    useState(false);

  const [error, setError] = useState("");

  // ----------------------------------------------
  // TASK FORM
  // ----------------------------------------------

  const [showTaskForm, setShowTaskForm] =
    useState(false);

  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] =
    useState("");
  const [taskAssignee, setTaskAssignee] =
    useState("");
  const [taskDueDate, setTaskDueDate] =
    useState("");

  const [creatingTask, setCreatingTask] =
    useState(false);

  // ----------------------------------------------
  // MEETING FORM
  // ----------------------------------------------

  const [showMeetingForm, setShowMeetingForm] =
    useState(false);

  const [meetingTitle, setMeetingTitle] =
    useState("");
  const [meetingDescription, setMeetingDescription] =
    useState("");
  const [meetingDate, setMeetingDate] =
    useState("");
  const [meetingStartTime, setMeetingStartTime] =
    useState("");
  const [meetingStartPeriod, setMeetingStartPeriod] =
    useState("AM");
  const [meetingEndTime, setMeetingEndTime] =
    useState("");
  const [meetingEndPeriod, setMeetingEndPeriod] =
    useState("AM");

  const [creatingMeeting, setCreatingMeeting] =
    useState(false);

  // ----------------------------------------------
  // CLIENT REQUEST FORM
  // ----------------------------------------------

  const [showRequestForm, setShowRequestForm] =
    useState(false);

  const [requestTitle, setRequestTitle] =
    useState("");
  const [requestDescription, setRequestDescription] =
    useState("");
  const [requestPriority, setRequestPriority] =
    useState("Medium");
  const [requestBy, setRequestBy] =
    useState("Client");

  const [creatingRequest, setCreatingRequest] =
    useState(false);

  // ----------------------------------------------
  // CURRENT USER
  // ----------------------------------------------

  const currentUserId =
    getId(user?._id) || getId(user?.id);

  // ----------------------------------------------
  // LOAD PROJECT
  // ----------------------------------------------

  useEffect(() => {
    let activeSocket;

    async function init() {
      try {
        setError("");

        const res = await api.get(
          `/projects/${id}`
        );

        setProject(res.data.project);
        setMessages(res.data.messages || []);
        setFiles(res.data.project.files || []);

        const token = getToken();

        if (!token) {
          setError(
            "Authentication token not found. Please login again."
          );
          return;
        }

        activeSocket = io(SOCKET_URL, {
          auth: {
            token,
          },
        });

        activeSocket.on("connect", () => {
          console.log(
            "[workspace] socket connected"
          );

          activeSocket.emit(
            "joinProject",
            id
          );
        });

        activeSocket.on("newMessage", (msg) => {
          setMessages((prev) => [
            ...prev,
            msg,
          ]);

          if (msg.isAI) {
            setAiThinking(false);
          }
        });

        activeSocket.on("aiThinking", () => {
          setAiThinking(true);
        });

        activeSocket.on(
          "filesUpdated",
          ({ files: updatedFiles }) => {
            setFiles(updatedFiles || []);
          }
        );

        activeSocket.on(
          "fileUpdated",
          ({ files: updatedFiles }) => {
            setFiles(updatedFiles || []);
          }
        );

        setSocket(activeSocket);
      } catch (err) {
        console.error(
          "Load project error:",
          err
        );

        setError(
          err.response?.data?.message ||
            "Failed to load project"
        );
      }
    }

    init();

    return () => {
      activeSocket?.disconnect();
      setSocket(null);
    };
  }, [id]);

  // ----------------------------------------------
  // LOAD WORKPLACE DATA
  // ----------------------------------------------

  async function loadWorkspaceData() {
    try {
      setLoadingData(true);

      const [
        tasksRes,
        meetingsRes,
        requestsRes,
      ] = await Promise.all([
        api.get(`/projects/${id}/tasks`),
        api.get(`/projects/${id}/meetings`),
        api.get(
          `/projects/${id}/client-requests`
        ),
      ]);

      setTasks(tasksRes.data.tasks || []);
      setMeetings(meetingsRes.data.meetings || []);
      setClientRequests(
        requestsRes.data.requests || []
      );
    } catch (err) {
      console.error(
        "Load workplace data error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to load workplace data"
      );
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    loadWorkspaceData();
  }, [id]);

  // ----------------------------------------------
  // TEAM CHAT
  // ----------------------------------------------

  function handleSend(text) {
    if (!socket) {
      return;
    }

    socket.emit("sendMessage", {
      projectId: id,
      text,
    });
  }

  // ----------------------------------------------
  // COLLABORATOR
  // ----------------------------------------------

  function handleCollaboratorAdded(
    updatedProject
  ) {
    setProject(updatedProject);
  }

  // ----------------------------------------------
  // ACTIVE FILE
  // ----------------------------------------------

  const activeFile = useMemo(
    () =>
      files.find(
        (file) =>
          file.path === activePath
      ) || null,
    [files, activePath]
  );

  // ----------------------------------------------
  // PROJECT COUNTS
  // ----------------------------------------------

  const taskCounts = useMemo(() => {
    return {
      total: tasks.length,

      todo: tasks.filter(
        (task) => task.status === "Todo"
      ).length,

      inProgress: tasks.filter(
        (task) =>
          task.status === "In Progress"
      ).length,

      review: tasks.filter(
        (task) => task.status === "Review"
      ).length,

      done: tasks.filter(
        (task) => task.status === "Done"
      ).length,
    };
  }, [tasks]);

  const upcomingMeetings = useMemo(() => {
    const now = new Date();

    return meetings
      .filter(
        (meeting) =>
          new Date(meeting.startAt) >= now
      )
      .slice(0, 5);
  }, [meetings]);

  const pendingRequests = useMemo(() => {
    return clientRequests.filter(
      (request) =>
        request.status !== "Completed"
    );
  }, [clientRequests]);

  // ----------------------------------------------
  // CREATE TASK
  // ----------------------------------------------

  async function handleCreateTask(event) {
    event.preventDefault();

    if (!taskTitle.trim()) {
      return;
    }

    try {
      setCreatingTask(true);

      const res = await api.post(
        `/projects/${id}/tasks`,
        {
          title: taskTitle.trim(),
          description:
            taskDescription.trim(),
          assignee:
            taskAssignee || null,
          dueDate:
            taskDueDate || null,
        }
      );

      setTasks((prev) => [
        res.data.task,
        ...prev,
      ]);

      setTaskTitle("");
      setTaskDescription("");
      setTaskAssignee("");
      setTaskDueDate("");
      setShowTaskForm(false);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to create task"
      );
    } finally {
      setCreatingTask(false);
    }
  }

  // ----------------------------------------------
  // UPDATE TASK STATUS
  // ----------------------------------------------

  async function handleTaskStatus(
    taskId,
    status
  ) {
    try {
      const res = await api.patch(
        `/projects/${id}/tasks/${taskId}`,
        {
          status,
        }
      );

      setTasks((prev) =>
        prev.map((task) =>
          task._id === taskId
            ? res.data.task
            : task
        )
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to update task"
      );
    }
  }

  // ----------------------------------------------
  // CREATE MEETING
  // ----------------------------------------------

  async function handleCreateMeeting(
    event
  ) {
    event.preventDefault();

    if (!meetingTitle.trim()) {
      setError("Please enter a meeting title.");
      return;
    }

    if (!meetingDate) {
      setError("Please select a meeting date.");
      return;
    }

    if (!meetingStartTime) {
      setError("Please enter the starting time.");
      return;
    }

    if (!meetingEndTime) {
      setError("Please enter the ending time.");
      return;
    }

    const startTime24 = to24Hour(
      meetingStartTime,
      meetingStartPeriod
    );

    const endTime24 = to24Hour(
      meetingEndTime,
      meetingEndPeriod
    );

    if (!startTime24 || !endTime24) {
      setError(
        "Please enter valid starting and ending times."
      );
      return;
    }

    const startAt = new Date(
      `${meetingDate}T${startTime24}`
    );

    const endAt = new Date(
      `${meetingDate}T${endTime24}`
    );

    if (
      Number.isNaN(startAt.getTime()) ||
      Number.isNaN(endAt.getTime()) ||
      endAt <= startAt
    ) {
      setError(
        "Please choose a valid meeting date and make sure the ending time is after the starting time."
      );
      return;
    }

    try {
      setCreatingMeeting(true);

      const participants = [
        currentUserId,
        ...(project?.collaborators || [])
          .map(getId)
          .filter(
            (memberId) =>
              memberId &&
              memberId !== currentUserId
          ),
      ];

      const res = await api.post(
        `/projects/${id}/meetings`,
        {
          title: meetingTitle.trim(),
          description:
            meetingDescription.trim(),
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          participants,
        }
      );

      setMeetings((prev) => [
        ...prev,
        res.data.meeting,
      ]);

      setMeetingTitle("");
      setMeetingDescription("");
      setMeetingDate("");
      setMeetingStartTime("");
      setMeetingStartPeriod("AM");
      setMeetingEndTime("");
      setMeetingEndPeriod("AM");
      setShowMeetingForm(false);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to schedule meeting"
      );
    } finally {
      setCreatingMeeting(false);
    }
  }

  // ----------------------------------------------
  // CREATE CLIENT REQUEST
  // ----------------------------------------------

  async function handleCreateRequest(
    event
  ) {
    event.preventDefault();

    if (!requestTitle.trim()) {
      return;
    }

    try {
      setCreatingRequest(true);

      const res = await api.post(
        `/projects/${id}/client-requests`,
        {
          title: requestTitle.trim(),
          description:
            requestDescription.trim(),
          priority: requestPriority,
          requestedBy:
            requestBy.trim() || "Client",
        }
      );

      setClientRequests((prev) => [
        res.data.request,
        ...prev,
      ]);

      setRequestTitle("");
      setRequestDescription("");
      setRequestPriority("Medium");
      setRequestBy("Client");
      setShowRequestForm(false);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to create client request"
      );
    } finally {
      setCreatingRequest(false);
    }
  }

  // ----------------------------------------------
  // UPDATE CLIENT REQUEST
  // ----------------------------------------------

  async function handleRequestStatus(
    requestId,
    status
  ) {
    try {
      const res = await api.patch(
        `/projects/${id}/client-requests/${requestId}`,
        {
          status,
        }
      );

      setClientRequests((prev) =>
        prev.map((request) =>
          request._id === requestId
            ? res.data.request
            : request
        )
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to update client request"
      );
    }
  }

  // ----------------------------------------------
  // ERROR / LOADING
  // ----------------------------------------------

  if (error && !project) {
    return (
      <div className="h-screen bg-[#0f1117] flex flex-col items-center justify-center gap-4 text-gray-300 px-6 text-center">
        <p className="text-red-300">
          {error}
        </p>

        <button
          onClick={() => navigate("/")}
          className="text-blue-400 hover:underline"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="h-screen bg-[#0f1117] flex items-center justify-center text-gray-400">
        Loading workplace...
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#0f1117] text-white">
      {/* ----------------------------------------- */}
      {/* TOP BAR */}
      {/* ----------------------------------------- */}

      <header className="border-b border-[#252a34] bg-[#151922]">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate("/")}
              className="text-gray-400 hover:text-white text-sm shrink-0"
            >
              ← Projects
            </button>

            <div className="h-5 w-px bg-[#303642]" />

            <div className="min-w-0">
              <h1 className="font-semibold truncate">
                {project.name}
              </h1>

              <p className="text-xs text-gray-500 truncate">
                {project.description ||
                  "Project workplace"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`hidden sm:inline-flex px-2.5 py-1 rounded-full border text-xs ${statusClass(
                project.status
              )}`}
            >
              {project.status}
            </span>

            <button
              onClick={() =>
                setShowCollabModal(true)
              }
              className="text-sm bg-[#252b36] hover:bg-[#303744] text-gray-200 px-3 py-1.5 rounded-md"
            >
              + Collaborator
            </button>
          </div>
        </div>

        {/* --------------------------------------- */}
        {/* TAB BAR */}
        {/* --------------------------------------- */}

        <div className="px-4 flex gap-1 overflow-x-auto">
          {[
            ["overview", "Overview"],
            ["tasks", "Tasks"],
            ["meetings", "Meetings"],
            [
              "requests",
              "Client Requests",
            ],
            ["chat", "Team Chat"],
            ["code", "Code"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() =>
                setActiveTab(value)
              }
              className={`px-4 py-2.5 text-sm border-b-2 whitespace-nowrap transition ${
                activeTab === value
                  ? "border-blue-500 text-white"
                  : "border-transparent text-gray-500 hover:text-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* ----------------------------------------- */}
      {/* ERROR BAR */}
      {/* ----------------------------------------- */}

      {error && (
        <div className="px-4 py-2 bg-red-950/40 border-b border-red-900/50 text-red-300 text-sm flex items-center justify-between">
          <span>{error}</span>

          <button
            onClick={() => setError("")}
            className="text-red-400 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      {/* ----------------------------------------- */}
      {/* CONTENT */}
      {/* ----------------------------------------- */}

      <main className="flex-1 overflow-hidden">
        {/* ======================================= */}
        {/* OVERVIEW */}
        {/* ======================================= */}

        {activeTab === "overview" && (
          <div className="h-full overflow-y-auto p-5">
            <div className="max-w-7xl mx-auto space-y-6">
              <div>
                <h2 className="text-xl font-semibold">
                  Project Overview
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Everything your team needs for this
                  project.
                </p>
              </div>

              {/* STAT CARDS */}

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#171c25] border border-[#252a34] rounded-xl p-4">
                  <p className="text-gray-500 text-xs uppercase">
                    Tasks
                  </p>

                  <p className="text-2xl font-bold mt-2">
                    {taskCounts.total}
                  </p>

                  <p className="text-xs text-gray-500 mt-1">
                    {taskCounts.done} completed
                  </p>
                </div>

                <div className="bg-[#171c25] border border-[#252a34] rounded-xl p-4">
                  <p className="text-gray-500 text-xs uppercase">
                    In Progress
                  </p>

                  <p className="text-2xl font-bold mt-2">
                    {taskCounts.inProgress}
                  </p>

                  <p className="text-xs text-gray-500 mt-1">
                    Active work
                  </p>
                </div>

                <div className="bg-[#171c25] border border-[#252a34] rounded-xl p-4">
                  <p className="text-gray-500 text-xs uppercase">
                    Meetings
                  </p>

                  <p className="text-2xl font-bold mt-2">
                    {meetings.length}
                  </p>

                  <p className="text-xs text-gray-500 mt-1">
                    {upcomingMeetings.length} upcoming
                  </p>
                </div>

                <div className="bg-[#171c25] border border-[#252a34] rounded-xl p-4">
                  <p className="text-gray-500 text-xs uppercase">
                    Client Requests
                  </p>

                  <p className="text-2xl font-bold mt-2">
                    {clientRequests.length}
                  </p>

                  <p className="text-xs text-gray-500 mt-1">
                    {pendingRequests.length} pending
                  </p>
                </div>
              </div>

              {/* PROJECT DETAILS */}

              <div className="grid lg:grid-cols-2 gap-5">
                <div className="bg-[#171c25] border border-[#252a34] rounded-xl p-5">
                  <h3 className="font-semibold">
                    Project Details
                  </h3>

                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">
                        Status
                      </p>

                      <p className="mt-1">
                        {project.status}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">
                        Priority
                      </p>

                      <span
                        className={`inline-flex mt-1 px-2 py-1 text-xs rounded-full border ${priorityClass(
                          project.priority
                        )}`}
                      >
                        {project.priority}
                      </span>
                    </div>

                    <div>
                      <p className="text-gray-500">
                        Start Date
                      </p>

                      <p className="mt-1">
                        {formatDate(
                          project.startDate
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">
                        Due Date
                      </p>

                      <p className="mt-1">
                        {formatDate(
                          project.dueDate
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#171c25] border border-[#252a34] rounded-xl p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">
                      Team
                    </h3>

                    <span className="text-xs text-gray-500">
                      {(project.collaborators
                        ?.length || 0) + 1} members
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center font-semibold">
                        {project.owner?.name
                          ?.charAt(0)
                          ?.toUpperCase() || "O"}
                      </div>

                      <div>
                        <p className="text-sm">
                          {project.owner?.name ||
                            "Project Owner"}
                        </p>

                        <p className="text-xs text-gray-500">
                          Owner
                        </p>
                      </div>
                    </div>

                    {(project.collaborators ||
                      []).map((member) => (
                      <div
                        key={member._id}
                        className="flex items-center gap-3"
                      >
                        <div className="w-9 h-9 rounded-full bg-[#303744] flex items-center justify-center font-semibold">
                          {member.name
                            ?.charAt(0)
                            ?.toUpperCase() ||
                            "U"}
                        </div>

                        <div>
                          <p className="text-sm">
                            {member.name}
                          </p>

                          <p className="text-xs text-gray-500">
                            {member.email}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* NEXT MEETINGS */}

              <div className="bg-[#171c25] border border-[#252a34] rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">
                    Upcoming Meetings
                  </h3>

                  <button
                    onClick={() =>
                      setActiveTab("meetings")
                    }
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    View all
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {upcomingMeetings.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No upcoming meetings.
                    </p>
                  ) : (
                    upcomingMeetings.map(
                      (meeting) => (
                        <div
                          key={meeting._id}
                          className="flex items-center justify-between gap-4 bg-[#11151c] rounded-lg p-3"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {meeting.title}
                            </p>

                            <p className="text-xs text-gray-500 mt-1">
                              {formatDateTime(
                                meeting.startAt
                              )}
                            </p>
                          </div>

                          <span className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-300">
                            Scheduled
                          </span>
                        </div>
                      )
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================= */}
        {/* TASKS */}
        {/* ======================================= */}

        {activeTab === "tasks" && (
          <div className="h-full overflow-y-auto p-5">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-semibold">
                    Tasks
                  </h2>

                  <p className="text-sm text-gray-500 mt-1">
                    Plan and track project work.
                  </p>
                </div>

                <button
                  onClick={() =>
                    setShowTaskForm(true)
                  }
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium"
                >
                  + New Task
                </button>
              </div>

              <div className="grid md:grid-cols-4 gap-4">
                {[
                  ["Todo", "Todo"],
                  [
                    "In Progress",
                    "In Progress",
                  ],
                  ["Review", "Review"],
                  ["Done", "Done"],
                ].map(([status, title]) => {
                  const columnTasks =
                    tasks.filter(
                      (task) =>
                        task.status === status
                    );

                  return (
                    <div
                      key={status}
                      className="bg-[#171c25] border border-[#252a34] rounded-xl p-3 min-h-[300px]"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-sm">
                          {title}
                        </h3>

                        <span className="text-xs text-gray-500">
                          {columnTasks.length}
                        </span>
                      </div>

                      <div className="space-y-3">
                        {columnTasks.map((task) => (
                          <div
                            key={task._id}
                            className="bg-[#11151c] border border-[#252a34] rounded-lg p-3"
                          >
                            <p className="text-sm font-medium">
                              {task.title}
                            </p>

                            {task.description && (
                              <p className="text-xs text-gray-500 mt-2 line-clamp-3">
                                {task.description}
                              </p>
                            )}


                            {task.assignee && (
                              <div className="mt-3">
                                <span className="px-2 py-1 rounded-full bg-[#252b36] text-gray-400 text-[10px]">
                                  {task.assignee.name}
                                </span>
                              </div>
                            )}


                            {task.dueDate && (
                              <p className="text-[11px] text-gray-500 mt-2">
                                Due{" "}
                                {formatDate(
                                  task.dueDate
                                )}
                              </p>
                            )}

                            <select
                              value={task.status}
                              onChange={(event) =>
                                handleTaskStatus(
                                  task._id,
                                  event.target.value
                                )
                              }
                              className="mt-3 w-full bg-[#1c222c] border border-[#303744] rounded-md px-2 py-1.5 text-xs outline-none"
                            >
                              <option value="Todo">
                                Todo
                              </option>
                              <option value="In Progress">
                                In Progress
                              </option>
                              <option value="Review">
                                Review
                              </option>
                              <option value="Done">
                                Done
                              </option>
                            </select>
                          </div>
                        ))}

                        {columnTasks.length === 0 && (
                          <p className="text-xs text-gray-600 text-center py-8">
                            No tasks
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ======================================= */}
        {/* MEETINGS */}
        {/* ======================================= */}

        {activeTab === "meetings" && (
          <div className="h-full overflow-y-auto p-5">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-semibold">
                    Meetings
                  </h2>

                  <p className="text-sm text-gray-500 mt-1">
                    Schedule project meetings with
                    your team.
                  </p>
                </div>

                <button
                  onClick={() =>
                    setShowMeetingForm(true)
                  }
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium"
                >
                  + Schedule Meeting
                </button>
              </div>

              <div className="space-y-3">
                {meetings.length === 0 ? (
                  <div className="bg-[#171c25] border border-[#252a34] rounded-xl p-10 text-center">
                    <p className="text-gray-500">
                      No meetings scheduled yet.
                    </p>
                  </div>
                ) : (
                  meetings.map((meeting) => (
                    <div
                      key={meeting._id}
                      className="bg-[#171c25] border border-[#252a34] rounded-xl p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-medium">
                            {meeting.title}
                          </h3>

                          <p className="text-sm text-gray-500 mt-1">
                            {meeting.description ||
                              "Project meeting"}
                          </p>
                        </div>

                        <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-300 text-xs">
                          Scheduled
                        </span>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3 mt-4 text-sm">
                        <div>
                          <p className="text-gray-500">
                            Starts
                          </p>

                          <p className="mt-1">
                            {formatDateTime(
                              meeting.startAt
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-gray-500">
                            Participants
                          </p>

                          <p className="mt-1">
                            {meeting.participants
                              ?.map(
                                (person) =>
                                  person.name
                              )
                              .join(", ") ||
                              "Team"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================================= */}
        {/* CLIENT REQUESTS */}
        {/* ======================================= */}

        {activeTab === "requests" && (
          <div className="h-full overflow-y-auto p-5">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-semibold">
                    Client Requests
                  </h2>

                  <p className="text-sm text-gray-500 mt-1">
                    Track requirements and changes
                    requested by clients.
                  </p>
                </div>

                <button
                  onClick={() =>
                    setShowRequestForm(true)
                  }
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium"
                >
                  + New Request
                </button>
              </div>

              <div className="space-y-3">
                {clientRequests.length === 0 ? (
                  <div className="bg-[#171c25] border border-[#252a34] rounded-xl p-10 text-center">
                    <p className="text-gray-500">
                      No client requests yet.
                    </p>
                  </div>
                ) : (
                  clientRequests.map((request) => (
                    <div
                      key={request._id}
                      className="bg-[#171c25] border border-[#252a34] rounded-xl p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="font-medium">
                            {request.title}
                          </h3>

                          <p className="text-sm text-gray-500 mt-1">
                            {request.description ||
                              "No additional description"}
                          </p>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-full border text-xs shrink-0 ${statusClass(
                            request.status
                          )}`}
                        >
                          {request.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-4">
                        <span
                          className={`px-2 py-1 rounded-full border text-[10px] ${priorityClass(
                            request.priority
                          )}`}
                        >
                          {request.priority}
                        </span>

                        <span className="px-2 py-1 rounded-full bg-[#252b36] text-gray-400 text-[10px]">
                          Requested by{" "}
                          {request.requestedBy ||
                            "Client"}
                        </span>

                        {request.assignedTo && (
                          <span className="px-2 py-1 rounded-full bg-[#252b36] text-gray-400 text-[10px]">
                            Assigned to{" "}
                            {
                              request.assignedTo
                                .name
                            }
                          </span>
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <span className="text-xs text-gray-600">
                          Created{" "}
                          {formatDate(
                            request.createdAt
                          )}
                        </span>

                        <select
                          value={request.status}
                          onChange={(event) =>
                            handleRequestStatus(
                              request._id,
                              event.target.value
                            )
                          }
                          className="ml-auto bg-[#1c222c] border border-[#303744] rounded-md px-2 py-1.5 text-xs outline-none"
                        >
                          <option value="Pending">
                            Pending
                          </option>

                          <option value="In Progress">
                            In Progress
                          </option>

                          <option value="Review">
                            Review
                          </option>

                          <option value="Completed">
                            Completed
                          </option>

                          <option value="Rejected">
                            Rejected
                          </option>
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================================= */}
        {/* TEAM CHAT */}
        {/* ======================================= */}

        {activeTab === "chat" && (
          <section className="h-full">
            <ChatWindow
              messages={messages}
              currentUserId={currentUserId}
              onSend={handleSend}
              aiThinking={aiThinking}
            />
          </section>
        )}

        {/* ======================================= */}
        {/* CODE */}
        {/* ======================================= */}

        {activeTab === "code" && (
          <div className="h-full grid grid-cols-[240px_1fr]">
            <aside className="border-r border-[#252a34] overflow-y-auto bg-[#151922]">
              <div className="px-4 py-3 text-xs uppercase tracking-wide text-gray-500 border-b border-[#252a34]">
                Project Files
              </div>

              <FileExplorer
                files={files}
                activePath={activePath}
                onSelect={setActivePath}
              />
            </aside>

            <section className="overflow-hidden bg-[#10131a]">
              <CodeViewer file={activeFile} />
            </section>
          </div>
        )}
      </main>

      {/* ========================================= */}
      {/* TASK MODAL */}
      {/* ========================================= */}

      {showTaskForm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateTask}
            className="w-full max-w-lg bg-[#171c25] border border-[#303744] rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold text-lg">
                  Create Task
                </h3>

                <p className="text-xs text-gray-500 mt-1">
                  Add a new piece of work to the project.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowTaskForm(false)
                }
                className="text-gray-500 hover:text-white text-xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-2">
                  Task Title
                </label>

                <input
                  value={taskTitle}
                onChange={(event) =>
                  setTaskTitle(
                    event.target.value
                  )
                }
                  placeholder="Task title"
                  className="w-full bg-[#0f131a] border border-[#303744] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-2">
                  Description
                </label>

                <textarea
                value={taskDescription}
                onChange={(event) =>
                  setTaskDescription(
                    event.target.value
                  )
                }
                  placeholder="Description"
                  rows={4}
                  className="w-full bg-[#0f131a] border border-[#303744] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-2">
                  Assignee
                </label>

                <select
                  value={taskAssignee}
                  onChange={(event) =>
                    setTaskAssignee(
                      event.target.value
                    )
                  }
                  className="w-full bg-[#0f131a] border border-[#303744] rounded-lg px-3 py-2.5 text-sm outline-none"
                >
                  <option value="">
                    Unassigned
                  </option>

                  {project.owner && (
                    <option
                      value={project.owner._id}
                    >
                      {project.owner.name} (Owner)
                    </option>
                  )}

                  {project.collaborators
                    ?.filter(
                      (member) =>
                        member._id !==
                        project.owner?._id
                    )
                    .map((member) => (
                      <option
                        key={member._id}
                        value={member._id}
                      >
                        {member.name}
                      </option>
                    ))}
                </select>

                {!project.owner &&
                  !project.collaborators?.length && (
                    <p className="text-[11px] text-gray-600 mt-2">
                      No project members are available to assign this task.
                    </p>
                  )}
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-2">
                  Due Date
                </label>

                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(event) =>
                    setTaskDueDate(
                      event.target.value
                    )
                  }
                  onClick={(event) =>
                    event.currentTarget.showPicker?.()
                  }
                  className="w-full bg-[#0f131a] border border-[#303744] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />

                <p className="text-[11px] text-gray-600 mt-2">
                  Select a date from the calendar.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() =>
                  setShowTaskForm(false)
                }
                className="px-4 py-2 rounded-lg bg-[#252b36] text-sm"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  creatingTask ||
                  !taskTitle.trim()
                }
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                {creatingTask
                  ? "Creating..."
                  : "Create Task"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================= */}
      {/* MEETING MODAL */}
      {/* ========================================= */}

      {showMeetingForm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateMeeting}
            className="w-full max-w-lg bg-[#171c25] border border-[#303744] rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold text-lg">
                  Schedule Meeting
                </h3>

                <p className="text-xs text-gray-500 mt-1">
                  All current project members will be
                  added.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowMeetingForm(false)
                }
                className="text-gray-500 hover:text-white text-xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <input
                value={meetingTitle}
                onChange={(event) =>
                  setMeetingTitle(
                    event.target.value
                  )
                }
                placeholder="Meeting title"
                className="w-full bg-[#0f131a] border border-[#303744] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              />

              <textarea
                value={meetingDescription}
                onChange={(event) =>
                  setMeetingDescription(
                    event.target.value
                  )
                }
                placeholder="Agenda / description"
                rows={4}
                className="w-full bg-[#0f131a] border border-[#303744] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 resize-none"
              />

              <div>
                <label className="text-xs text-gray-500 block mb-2">
                  Meeting Date
                </label>

                <input
                  type="date"
                  value={meetingDate}
                  onChange={(event) =>
                    setMeetingDate(
                      event.target.value
                    )
                  }
                  onClick={(event) =>
                    event.currentTarget.showPicker?.()
                  }
                  className="w-full bg-[#0f131a] border border-[#303744] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-2">
                    Starting Time
                  </label>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={5}
                      value={meetingStartTime}
                      onChange={(event) => {
                        const value =
                          event.target.value.replace(/[^0-9:]/g, "");

                        setMeetingStartTime(value);
                      }}
                      placeholder="05:30"
                      className="min-w-0 flex-1 bg-[#0f131a] border border-[#303744] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                    />

                    <select
                      value={meetingStartPeriod}
                      onChange={(event) =>
                        setMeetingStartPeriod(
                          event.target.value
                        )
                      }
                      className="w-24 shrink-0 bg-[#0f131a] border border-[#303744] rounded-lg px-3 py-2.5 text-sm outline-none"
                    >
                      <option value="AM">
                        AM
                      </option>
                      <option value="PM">
                        PM
                      </option>
                    </select>
                  </div>

                  <p className="text-[11px] text-gray-600 mt-2">
                    Enter time as HH:MM
                  </p>
                </div>

                <div>
                  <label className="text-xs text-gray-500 block mb-2">
                    Ending Time
                  </label>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={5}
                      value={meetingEndTime}
                      onChange={(event) => {
                        const value =
                          event.target.value.replace(/[^0-9:]/g, "");

                        setMeetingEndTime(value);
                      }}
                      placeholder="06:30"
                      className="min-w-0 flex-1 bg-[#0f131a] border border-[#303744] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                    />

                    <select
                      value={meetingEndPeriod}
                      onChange={(event) =>
                        setMeetingEndPeriod(
                          event.target.value
                        )
                      }
                      className="w-24 shrink-0 bg-[#0f131a] border border-[#303744] rounded-lg px-3 py-2.5 text-sm outline-none"
                    >
                      <option value="AM">
                        AM
                      </option>
                      <option value="PM">
                        PM
                      </option>
                    </select>
                  </div>

                  <p className="text-[11px] text-gray-600 mt-2">
                    Enter time as HH:MM
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() =>
                  setShowMeetingForm(false)
                }
                className="px-4 py-2 rounded-lg bg-[#252b36] text-sm"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={creatingMeeting}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                {creatingMeeting
                  ? "Scheduling..."
                  : "Schedule Meeting"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================= */}
      {/* CLIENT REQUEST MODAL */}
      {/* ========================================= */}

      {showRequestForm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateRequest}
            className="w-full max-w-lg bg-[#171c25] border border-[#303744] rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold text-lg">
                  New Client Request
                </h3>

                <p className="text-xs text-gray-500 mt-1">
                  Record a requirement or change from
                  the client.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowRequestForm(false)
                }
                className="text-gray-500 hover:text-white text-xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <input
                value={requestTitle}
                onChange={(event) =>
                  setRequestTitle(
                    event.target.value
                  )
                }
                placeholder="Example: Add payment gateway"
                className="w-full bg-[#0f131a] border border-[#303744] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              />

              <textarea
                value={requestDescription}
                onChange={(event) =>
                  setRequestDescription(
                    event.target.value
                  )
                }
                placeholder="Describe the client's requirement..."
                rows={5}
                className="w-full bg-[#0f131a] border border-[#303744] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 resize-none"
              />

              <div className="grid sm:grid-cols-2 gap-3">
                <input
                  value={requestBy}
                  onChange={(event) =>
                    setRequestBy(
                      event.target.value
                    )
                  }
                  placeholder="Requested by"
                  className="w-full bg-[#0f131a] border border-[#303744] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />

                <select
                  value={requestPriority}
                  onChange={(event) =>
                    setRequestPriority(
                      event.target.value
                    )
                  }
                  className="w-full bg-[#0f131a] border border-[#303744] rounded-lg px-3 py-2.5 text-sm outline-none"
                >
                  <option value="Low">
                    Low
                  </option>

                  <option value="Medium">
                    Medium
                  </option>

                  <option value="High">
                    High
                  </option>

                  <option value="Critical">
                    Critical
                  </option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() =>
                  setShowRequestForm(false)
                }
                className="px-4 py-2 rounded-lg bg-[#252b36] text-sm"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  creatingRequest ||
                  !requestTitle.trim()
                }
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                {creatingRequest
                  ? "Creating..."
                  : "Create Request"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================= */}
      {/* COLLABORATOR MODAL */}
      {/* ========================================= */}

      {showCollabModal && (
        <AddCollaboratorModal
          projectId={id}
          onClose={() =>
            setShowCollabModal(false)
          }
          onAdded={handleCollaboratorAdded}
        />
      )}
    </div>
  );
}