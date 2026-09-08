import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import { io } from "socket.io-client";

import api from "../api/axios";
import {
  useAuth,
} from "../context/AuthContext.jsx";

function getId(value) {
  if (!value) return "";

  if (typeof value === "object") {
    return (
      value._id?.toString() ||
      value.id?.toString() ||
      ""
    );
  }

  return value.toString();
}

function getInitial(name) {
  return (
    name?.trim()?.charAt(0)?.toUpperCase() ||
    "G"
  );
}

function getToken() {
  return (
    sessionStorage.getItem("token") ||
    localStorage.getItem("token")
  );
}

function getMessageLink(text) {
  if (!text) return "";

  const match = text.match(/(https?:\/\/[^\s]+)/i);
  return match ? match[1] : "";
}

function getSharedAttachments(message) {
  if (!message) return [];

  if (Array.isArray(message.attachments)) {
    return message.attachments;
  }

  if (Array.isArray(message.files)) {
    return message.files;
  }

  if (message.fileUrl) {
    return [
      {
        url: message.fileUrl,
        name: message.fileName || "Document",
        type: message.fileType || "document",
      },
    ];
  }

  if (message.mediaUrl) {
    return [
      {
        url: message.mediaUrl,
        name: message.mediaName || "Media",
        type: message.mediaType || "media",
      },
    ];
  }

  return [];
}

export default function GroupChat() {
  const {
    id,
  } = useParams();

  const {
    user,
  } = useAuth();

  const navigate =
    useNavigate();

  const socketRef =
    useRef(null);

  const messagesEndRef =
    useRef(null);

  /*
   * =========================================================
   * CHAT STATE
   * =========================================================
   */

  const [
    conversation,
    setConversation,
  ] = useState(null);

  const [
    messages,
    setMessages,
  ] = useState([]);

  const [
    text,
    setText,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    sending,
    setSending,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    socketConnected,
    setSocketConnected,
  ] = useState(false);

  /*
   * Actual member online status.
   */
  const [
    memberOnline,
    setMemberOnline,
  ] = useState({});

  /*
   * =========================================================
   * GROUP MANAGEMENT STATE
   * =========================================================
   */

  const [
    showGroupInfo,
    setShowGroupInfo,
  ] = useState(false);

  const [
    managementTab,
    setManagementTab,
  ] = useState("members");

  const [
    groupNameInput,
    setGroupNameInput,
  ] = useState("");

  const [
    renameLoading,
    setRenameLoading,
  ] = useState(false);

  const [
    groupDescription,
    setGroupDescription,
  ] = useState("");

  const [
    groupAvatar,
    setGroupAvatar,
  ] = useState("");

  const [
    editingGroupName,
    setEditingGroupName,
  ] = useState(false);

  const [
    editingGroupDescription,
    setEditingGroupDescription,
  ] = useState(false);

  const [
    editGroupName,
    setEditGroupName,
  ] = useState("");

  const [
    editGroupDescription,
    setEditGroupDescription,
  ] = useState("");



  const profileFileInputRef =
    useRef(null);

  const [
    addMemberQuery,
    setAddMemberQuery,
  ] = useState("");

  const [
    addMemberResults,
    setAddMemberResults,
  ] = useState([]);

  const [
    selectedAddMember,
    setSelectedAddMember,
  ] = useState(null);

  const [
    addMemberLoading,
    setAddMemberLoading,
  ] = useState(false);

  const [
    searchingMembers,
    setSearchingMembers,
  ] = useState(false);

  const [
    removingMemberId,
    setRemovingMemberId,
  ] = useState(null);

  const [
    leavingGroup,
    setLeavingGroup,
  ] = useState(false);

  const [
    workplace,
    setWorkplace,
  ] = useState(null);

  const [
    creatingWorkplace,
    setCreatingWorkplace,
  ] = useState(false);

  const [
    showWorkplaceConfirm,
    setShowWorkplaceConfirm,
  ] = useState(false);

  const [
    workplaceName,
    setWorkplaceName,
  ] = useState("");

  const [
    showMoreMenu,
    setShowMoreMenu,
  ] = useState(false);

  const [
    chatSearchOpen,
    setChatSearchOpen,
  ] = useState(false);

  const [
    chatSearch,
    setChatSearch,
  ] = useState("");

  const [
    selectedMessageIds,
    setSelectedMessageIds,
  ] = useState([]);

  const [
    selectionMode,
    setSelectionMode,
  ] = useState(false);

  const [
    deletingMessages,
    setDeletingMessages,
  ] = useState(false);

  const [
    mutedNotifications,
    setMutedNotifications,
  ] = useState(false);

  const [
    disappearingMessages,
    setDisappearingMessages,
  ] = useState(false);

  const [
    isFavorite,
    setIsFavorite,
  ] = useState(false);

  /*
   * =========================================================
   * GROUP TOOLS
   * =========================================================
   */

  const [
    showAttachmentMenu,
    setShowAttachmentMenu,
  ] = useState(false);

  const [
    showProjectFiles,
    setShowProjectFiles,
  ] = useState(false);

  const [
    projectFiles,
    setProjectFiles,
  ] = useState([]);

  const [
    loadingProjectFiles,
    setLoadingProjectFiles,
  ] = useState(false);

  const [
    projectFileSearch,
    setProjectFileSearch,
  ] = useState("");

  const [
    showMeetingForm,
    setShowMeetingForm,
  ] = useState(false);

  const [
    meetingTitle,
    setMeetingTitle,
  ] = useState("");

  const [
    meetingDescription,
    setMeetingDescription,
  ] = useState("");

  const [
    meetingDate,
    setMeetingDate,
  ] = useState("");

  const [
    meetingStartTime,
    setMeetingStartTime,
  ] = useState("");

  const [
    meetingStartPeriod,
    setMeetingStartPeriod,
  ] = useState("AM");

  const [
    meetingEndTime,
    setMeetingEndTime,
  ] = useState("");

  const [
    meetingEndPeriod,
    setMeetingEndPeriod,
  ] = useState("AM");

  const [
    schedulingMeeting,
    setSchedulingMeeting,
  ] = useState(false);

  const [
    showAISummary,
    setShowAISummary,
  ] = useState(false);

  const [
    showAISummaryPrompt,
    setShowAISummaryPrompt,
  ] = useState(true);

  const [
    aiSummary,
    setAISummary,
  ] = useState("");

  const [
    aiSummaryLoading,
    setAISummaryLoading,
  ] = useState(false);

  const [
    aiSummaryError,
    setAISummaryError,
  ] = useState("");

  const [
    showSimpleFeatureModal,
    setShowSimpleFeatureModal,
  ] = useState("");

  const fileInputRef =
    useRef(null);

  /*
   * =========================================================
   * CURRENT USER
   * =========================================================
   */

  const currentUserId =
    getId(user);

  /*
   * =========================================================
   * PARTICIPANTS
   * =========================================================
   */

  const participants =
    Array.isArray(
      conversation?.participants
    )
      ? conversation.participants
      : [];

  const isAdmin =
    getId(
      conversation?.createdBy
    ) ===
    currentUserId;

  useEffect(() => {
    if (!id) return;

    setShowAISummaryPrompt(true);
    setShowAISummary(false);
    setAISummary("");
    setAISummaryError("");

    setMutedNotifications(
      localStorage.getItem(`groupMuted:${id}`) ===
        "true"
    );

    setDisappearingMessages(
      localStorage.getItem(
        `groupDisappearing:${id}`
      ) === "true"
    );

    setIsFavorite(
      localStorage.getItem(`groupFavorite:${id}`) ===
        "true"
    );
  }, [id]);

  const onlineMemberCount =
    participants.filter(
      (participant) =>
        memberOnline[
          getId(
            participant
          )
        ]
    ).length;

  const sharedAttachments = messages.flatMap(
    getSharedAttachments
  );

  const sharedMedia = sharedAttachments.filter(
    (item) => {
      const type =
        item?.type ||
        item?.mimeType ||
        "";

      return (
        type.startsWith?.("image/") ||
        type.startsWith?.("video/") ||
        ["image", "video", "photo", "media"].includes(
          type.toLowerCase?.() || ""
        )
      );
    }
  );

  const sharedDocuments = sharedAttachments.filter(
    (item) => !sharedMedia.includes(item)
  );

  const sharedLinks = messages
    .map((message) => ({
      message,
      url: getMessageLink(message?.text),
    }))
    .filter((item) => item.url);

  /*
   * =========================================================
   * LOAD GROUP
   * =========================================================
   */

  async function loadGroup() {
    if (!id) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res =
        await api.get(
          `/conversations/${id}`
        );

      const loadedConversation =
        res.data?.conversation ||
        null;

      const loadedMessages =
        Array.isArray(
          res.data?.messages
        )
          ? res.data.messages
          : [];

      // Check whether this group already has a linked Workplace.
      try {
        const projectsRes =
          await api.get("/projects");

        const linkedWorkplace =
          (projectsRes.data?.projects || []).find(
            (project) =>
              getId(project?.sourceGroup) ===
              id.toString()
          ) || null;

        setWorkplace(linkedWorkplace);
      } catch (projectErr) {
        console.warn(
          "[group-chat] Workplace lookup failed:",
          projectErr?.message
        );
        setWorkplace(null);
      }

      if (
        loadedConversation &&
        loadedConversation.type !==
          "group"
      ) {
        setError(
          "This conversation is not a group."
        );

        return;
      }

      setConversation(
        loadedConversation
      );

      setMessages(
        loadedMessages
      );

      setGroupNameInput(
        loadedConversation?.name ||
          ""
      );

      setGroupDescription(
        localStorage.getItem(
          `groupDescription:${id}`
        ) || ""
      );

      setGroupAvatar(
        localStorage.getItem(
          `groupAvatar:${id}`
        ) || ""
      );
    } catch (err) {
      console.error(
        "Load group error:",
        err
      );

      setConversation(null);
      setMessages([]);

      setError(
        err.response?.data?.message ||
          "Failed to load group"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGroup();
  }, [id]);

  /*
   * =========================================================
   * SOCKET
   * =========================================================
   */

  useEffect(() => {
    if (!id) {
      return;
    }

    const token =
      getToken();

    if (!token) {
      setError(
        "Authentication token not found. Please login again."
      );

      return;
    }

    const socket =
      io(
        "http://localhost:5000",
        {
          auth: {
            token,
          },
        }
      );

    socketRef.current =
      socket;

    socket.on(
      "connect",
      () => {
        console.log(
          "[group-chat] socket connected:",
          socket.id
        );

        setSocketConnected(
          true
        );

        setError("");

        socket.emit(
          "joinConversation",
          id
        );
      }
    );

    socket.on(
      "connect_error",
      (err) => {
        console.error(
          "[group-chat] socket error:",
          err.message
        );

        setSocketConnected(
          false
        );

        setError(
          `Real-time connection failed: ${err.message}`
        );
      }
    );

    /*
     * =======================================================
     * USER PRESENCE
     * =======================================================
     */

    socket.on(
      "userPresence",
      ({
        userId,
        online,
      }) => {
        const changedUserId =
          userId?.toString();

        if (!changedUserId) {
          return;
        }

        setMemberOnline(
          (previous) => ({
            ...previous,

            [changedUserId]:
              Boolean(online),
          })
        );
      }
    );

    socket.on(
      "userOnlineStatus",
      ({
        userId,
        online,
      }) => {
        const targetId =
          userId?.toString();

        if (!targetId) {
          return;
        }

        setMemberOnline(
          (previous) => ({
            ...previous,

            [targetId]:
              Boolean(online),
          })
        );
      }
    );

    /*
     * =======================================================
     * GROUP UPDATED
     * =======================================================
     */

    socket.on(
      "groupUpdated",
      ({
        conversation:
          updatedConversation,
      }) => {
        if (
          getId(
            updatedConversation?._id
          ) !==
          id.toString()
        ) {
          return;
        }

        setConversation(
          updatedConversation
        );

        setGroupNameInput(
          updatedConversation
            ?.name || ""
        );
      }
    );

    /*
     * =======================================================
     * CURRENT USER REMOVED
     * =======================================================
     */

    socket.on(
      "groupMemberRemoved",
      ({
        conversationId,
      }) => {
        if (
          conversationId?.toString() !==
          id.toString()
        ) {
          return;
        }

        alert(
          "You have been removed from this group."
        );

        navigate("/");
      }
    );

    /*
     * =======================================================
     * GROUP MESSAGE
     * =======================================================
     */

    socket.on(
      "newGroupMessage",
      (message) => {
        const messageConversationId =
          getId(
            message?.conversation
          );

        if (
          messageConversationId !==
          id.toString()
        ) {
          return;
        }

        setMessages(
          (previousMessages) => {
            const messageId =
              getId(
                message?._id
              );

            const exists =
              messageId &&
              previousMessages.some(
                (existing) =>
                  getId(
                    existing?._id
                  ) ===
                  messageId
              );

            if (exists) {
              return previousMessages;
            }

            return [
              ...previousMessages,
              message,
            ];
          }
        );
      }
    );

    /*
     * =======================================================
     * DISCONNECT
     * =======================================================
     */

    socket.on(
      "disconnect",
      () => {
        setSocketConnected(
          false
        );
      }
    );

    /*
     * =======================================================
     * CLEANUP
     * =======================================================
     */

    return () => {
      if (
        socket.connected
      ) {
        socket.emit(
          "leaveConversation",
          id
        );
      }

      socket.removeAllListeners();

      socket.disconnect();

      if (
        socketRef.current ===
        socket
      ) {
        socketRef.current =
          null;
      }

      setSocketConnected(
        false
      );
    };
  }, [id, navigate]);

  /*
   * =========================================================
   * CHECK ONLINE STATUS OF MEMBERS
   * =========================================================
   */

  useEffect(() => {
    if (
      !socketConnected ||
      !socketRef.current ||
      participants.length ===
        0
    ) {
      return;
    }

    participants.forEach(
      (participant) => {
        const participantId =
          getId(
            participant
          );

        if (!participantId) {
          return;
        }

        socketRef.current.emit(
          "checkUserOnline",
          participantId
        );
      }
    );
  }, [
    socketConnected,
    participants,
  ]);

  /*
   * =========================================================
   * AUTO SCROLL
   * =========================================================
   */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView(
      {
        behavior:
          "smooth",
      }
    );
  }, [messages]);

  /*
   * =========================================================
   * OPEN GROUP INFO
   * =========================================================
   */

  function openGroupInfo() {
    setManagementTab(
      "members"
    );

    setGroupNameInput(
      conversation?.name ||
        ""
    );

    setAddMemberQuery("");
    setAddMemberResults([]);
    setSelectedAddMember(
      null
    );

    setShowGroupInfo(
      true
    );
  }

  function openAddMemberSection() {
    openGroupInfo();

    window.setTimeout(() => {
      document
        .getElementById("group-add-member-section")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 60);
  }

  /*
   * =========================================================
   * EDIT GROUP PROFILE
   * =========================================================
   */

  function startEditGroupName() {
    if (!isAdmin) {
      return;
    }

    setEditGroupName(
      conversation?.name || ""
    );
    setError("");
    setEditingGroupName(true);
  }

  function cancelEditGroupName() {
    setEditGroupName(
      conversation?.name || ""
    );
    setEditingGroupName(false);
  }

  function startEditGroupDescription() {
    if (!isAdmin) {
      return;
    }

    setEditGroupDescription(
      groupDescription || ""
    );
    setError("");
    setEditingGroupDescription(true);
  }

  function cancelEditGroupDescription() {
    setEditGroupDescription(
      groupDescription || ""
    );
    setEditingGroupDescription(false);
  }

  async function saveGroupNameInline() {
    const newName =
      editGroupName.trim();

    if (!newName) {
      setError(
        "Group name cannot be empty."
      );
      return;
    }

    try {
      setRenameLoading(true);
      setError("");

      const res =
        await api.put(
          `/conversations/${id}/name`,
          {
            name: newName,
          }
        );

      const updatedConversation =
        res.data?.conversation ||
        {
          ...conversation,
          name: newName,
        };

      setConversation(
        updatedConversation
      );
      setGroupNameInput(
        newName
      );
      setEditingGroupName(false);

      window.dispatchEvent(
        new Event(
          "conversationsUpdated"
        )
      );
    } catch (err) {
      console.error(
        "Inline rename group error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to rename group"
      );
    } finally {
      setRenameLoading(false);
    }
  }

  function saveGroupDescriptionInline() {
    const newDescription =
      editGroupDescription.trim();

    localStorage.setItem(
      `groupDescription:${id}`,
      newDescription
    );

    setGroupDescription(
      newDescription
    );
    setEditingGroupDescription(
      false
    );
    setError("");
  }

  function resizeGroupAvatar(file) {
    return new Promise(
      (resolve, reject) => {
        const reader =
          new FileReader();

        reader.onload = () => {
          const image =
            new Image();

          image.onload = () => {
            const maxSize = 512;
            const longest =
              Math.max(
                image.width,
                image.height
              );

            const scale =
              longest > maxSize
                ? maxSize / longest
                : 1;

            const canvas =
              document.createElement(
                "canvas"
              );

            canvas.width =
              Math.max(
                1,
                Math.round(
                  image.width * scale
                )
              );

            canvas.height =
              Math.max(
                1,
                Math.round(
                  image.height * scale
                )
              );

            const ctx =
              canvas.getContext(
                "2d"
              );

            if (!ctx) {
              reject(
                new Error(
                  "Could not create image canvas."
                )
              );
              return;
            }

            ctx.drawImage(
              image,
              0,
              0,
              canvas.width,
              canvas.height
            );

            resolve(
              canvas.toDataURL(
                "image/jpeg",
                0.82
              )
            );
          };

          image.onerror = () =>
            reject(
              new Error(
                "Invalid image."
              )
            );

          image.src =
            reader.result;
        };

        reader.onerror = () =>
          reject(
            new Error(
              "Could not read image."
            )
          );

        reader.readAsDataURL(file);
      }
    );
  }

  async function handleGroupAvatarChange(
    event
  ) {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError(
        "Please choose an image file."
      );
      return;
    }

    if (
      file.size >
      4 * 1024 * 1024
    ) {
      setError(
        "Please choose an image smaller than 4 MB."
      );
      return;
    }

    try {
      setError("");

      const dataUrl =
        await resizeGroupAvatar(
          file
        );

      setGroupAvatar(
        dataUrl
      );

      localStorage.setItem(
        `groupAvatar:${id}`,
        dataUrl
      );
    } catch (err) {
      console.error(
        "Group avatar error:",
        err
      );

      setError(
        "Could not load the selected image."
      );
    }
  }

  /*
   * =========================================================
   * SEARCH USERS FOR ADD MEMBER
   * =========================================================
   */

  async function searchMembers(
    e
  ) {
    const value =
      e.target.value;

    setAddMemberQuery(
      value
    );

    setSelectedAddMember(
      null
    );

    if (!value.trim()) {
      setAddMemberResults(
        []
      );

      return;
    }

    try {
      setSearchingMembers(
        true
      );

      const res =
        await api.get(
          `/users/search?q=${encodeURIComponent(
            value
          )}`
        );

      const existingIds =
        new Set(
          participants.map(
            (participant) =>
              getId(
                participant
              )
          )
        );

      const filtered =
        (
          Array.isArray(
            res.data
          )
            ? res.data
            : []
        ).filter(
          (searchUser) =>
            !existingIds.has(
              getId(
                searchUser
              )
            ) &&
            getId(
              searchUser
            ) !==
              currentUserId
        );

      setAddMemberResults(
        filtered
      );
    } catch (err) {
      console.error(
        "Search group members error:",
        err
      );

      setAddMemberResults(
        []
      );
    } finally {
      setSearchingMembers(
        false
      );
    }
  }

  /*
   * =========================================================
   * ADD MEMBER
   * =========================================================
   */

  async function handleAddMember() {
    if (
      !selectedAddMember
    ) {
      return;
    }

    try {
      setAddMemberLoading(
        true
      );

      setError("");

      const res =
        await api.post(
          `/conversations/${id}/members`,
          {
            userId:
              selectedAddMember._id,
          }
        );

      if (
        res.data?.conversation
      ) {
        setConversation(
          res.data.conversation
        );
      }

      setAddMemberQuery("");
      setAddMemberResults([]);
      setSelectedAddMember(
        null
      );

      /*
       * Refresh Dashboard's list when
       * the user later returns.
       */
      window.dispatchEvent(
        new Event(
          "conversationsUpdated"
        )
      );
    } catch (err) {
      console.error(
        "Add member error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to add member"
      );
    } finally {
      setAddMemberLoading(
        false
      );
    }
  }

  /*
   * =========================================================
   * RENAME GROUP
   * =========================================================
   */

  async function handleRename() {
    const newName =
      groupNameInput.trim();

    if (!newName) {
      setError(
        "Group name cannot be empty"
      );

      return;
    }

    try {
      setRenameLoading(
        true
      );

      setError("");

      const res =
        await api.put(
          `/conversations/${id}/name`,
          {
            name:
              newName,
          }
        );

      if (
        res.data?.conversation
      ) {
        setConversation(
          res.data.conversation
        );
      }

      window.dispatchEvent(
        new Event(
          "conversationsUpdated"
        )
      );
    } catch (err) {
      console.error(
        "Rename group error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to rename group"
      );
    } finally {
      setRenameLoading(
        false
      );
    }
  }

  /*
   * =========================================================
   * REMOVE MEMBER
   * =========================================================
   */

  async function handleRemoveMember(
    member
  ) {
    const memberId =
      getId(member);

    if (
      !memberId ||
      memberId ===
        currentUserId
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Remove ${member.name} from this group?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setRemovingMemberId(
        memberId
      );

      setError("");

      const res =
        await api.delete(
          `/conversations/${id}/members/${memberId}`
        );

      if (
        res.data?.conversation
      ) {
        setConversation(
          res.data.conversation
        );
      }

      window.dispatchEvent(
        new Event(
          "conversationsUpdated"
        )
      );
    } catch (err) {
      console.error(
        "Remove member error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to remove member"
      );
    } finally {
      setRemovingMemberId(
        null
      );
    }
  }

  /*
   * =========================================================
   * CREATE / OPEN WORKPLACE
   * =========================================================
   */

  async function handleCreateWorkplace() {
    if (!conversation || !currentUserId) {
      return;
    }

    if (workplace?._id) {
      setShowWorkplaceConfirm(false);
      navigate(`/project/${workplace._id}`);
      return;
    }

    const trimmedWorkplaceName =
      workplaceName.trim();

    if (!trimmedWorkplaceName) {
      setError(
        "Please enter a Workplace name."
      );
      return;
    }

    const groupMembers = participants
      .map((participant) => ({
        id: getId(participant),
        email: participant?.email,
      }))
      .filter(
        (member) =>
          member.id &&
          member.email &&
          member.id !== currentUserId
      );

    try {
      setCreatingWorkplace(true);
      setError("");

      const projectRes = await api.post(
        "/projects",
        {
          name: trimmedWorkplaceName,
          description:
            `Shared workplace for the ${conversation.name || "group"} group.`,
          sourceGroup: id,
        }
      );

      const createdProject =
        projectRes.data?.project;

      if (!createdProject?._id) {
        throw new Error(
          "Workplace was created but the project ID was not returned."
        );
      }

      const collaboratorResults =
        await Promise.allSettled(
          groupMembers.map((member) =>
            api.post(
              `/projects/${createdProject._id}/collaborators`,
              {
                email: member.email,
              }
            )
          )
        );

      const failedCount =
        collaboratorResults.filter(
          (result) =>
            result.status === "rejected"
        ).length;

      setWorkplace(createdProject);
      setWorkplaceName("");
      setShowWorkplaceConfirm(false);

      window.dispatchEvent(
        new Event("projectsUpdated")
      );

      if (failedCount > 0) {
        setError(
          `Workplace created, but ${failedCount} member(s) could not be added automatically.`
        );
      }

      navigate(
        `/project/${createdProject._id}`
      );
    } catch (err) {
      console.error(
        "Create workplace error:",
        err
      );

      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to create workplace"
      );
    } finally {
      setCreatingWorkplace(false);
    }
  }

  /*
   * =========================================================
   * LEAVE GROUP
   * =========================================================
   */

  async function handleLeaveGroup() {
    const confirmed =
      window.confirm(
        `Leave "${conversation?.name || "this group"}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setLeavingGroup(
        true
      );

      setError("");

      await api.post(
        `/conversations/${id}/leave`
      );

      window.dispatchEvent(
        new Event(
          "conversationsUpdated"
        )
      );

      navigate("/");
    } catch (err) {
      console.error(
        "Leave group error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to leave group"
      );
    } finally {
      setLeavingGroup(
        false
      );
    }
  }

  /*
   * =========================================================
   * SEND MESSAGE
   * =========================================================
   */

  function handleSend(e) {
    e.preventDefault();

    const messageText =
      text.trim();

    if (!messageText) {
      return;
    }

    if (sending) {
      return;
    }

    const socket =
      socketRef.current;

    if (
      !socket ||
      !socket.connected
    ) {
      setError(
        "Not connected to the chat server."
      );

      return;
    }

    try {
      setSending(true);
      setError("");

      socket.emit(
        "sendGroupMessage",
        {
          conversationId:
            id,

          text:
            messageText,
        }
      );

      setText("");
    } finally {
      setSending(false);
    }
  }

  /*
   * =========================================================
   * WHATSAPP-STYLE MORE MENU
   * =========================================================
   */

  function toggleMuteNotifications() {
    const nextValue = !mutedNotifications;

    setMutedNotifications(nextValue);

    localStorage.setItem(
      `groupMuted:${id}`,
      String(nextValue)
    );

    setShowMoreMenu(false);
  }

  function toggleDisappearingMessages() {
    const nextValue = !disappearingMessages;

    setDisappearingMessages(nextValue);

    localStorage.setItem(
      `groupDisappearing:${id}`,
      String(nextValue)
    );

    setShowMoreMenu(false);

    setError(
      nextValue
        ? "Disappearing messages enabled for this device."
        : "Disappearing messages disabled for this device."
    );
  }

  function toggleFavorite() {
    const nextValue = !isFavorite;

    setIsFavorite(nextValue);

    localStorage.setItem(
      `groupFavorite:${id}`,
      String(nextValue)
    );

    setShowMoreMenu(false);
  }

  function openChatSearch() {
    setShowMoreMenu(false);
    setChatSearchOpen(true);
    setChatSearch("");
  }

  function toggleSelectionMode() {
    setShowMoreMenu(false);
    setSelectedMessageIds([]);
    setSelectionMode(true);
  }

  function cancelMessageSelection() {
    setSelectedMessageIds([]);
    setSelectionMode(false);
  }

  function addToList() {
    localStorage.setItem(
      `groupList:${id}`,
      "true"
    );

    setShowMoreMenu(false);

    setError(
      "Group added to your list on this device."
    );
  }

  function toggleMessageSelection(messageId) {
    if (!messageId) return;

    setSelectedMessageIds((previous) =>
      previous.includes(messageId)
        ? previous.filter(
            (item) => item !== messageId
          )
        : [...previous, messageId]
    );
  }

  function exportChat() {
    const rows = messages.map((message) => {
      const date = message?.createdAt
        ? new Date(message.createdAt)
        : null;

      const timestamp =
        date &&
        !Number.isNaN(date.getTime())
          ? date.toLocaleString()
          : "";

      const sender =
        message?.senderName ||
        message?.sender?.name ||
        "User";

      return `[${timestamp}] ${sender}: ${
        message?.text || ""
      }`;
    });

    const blob = new Blob(
      [
        `Group: ${
          conversation?.name || "Group"
        }\n\n${rows.join("\n")}`,
      ],
      {
        type: "text/plain;charset=utf-8",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;
    link.download = `${
      conversation?.name || "group-chat"
    }-chat.txt`;

    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    setShowMoreMenu(false);
  }


  function getTodayDateInput() {
    const now = new Date();

    return `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`;
  }

  function normalizeTimeTo24Hour(
    time,
    period
  ) {
    const match =
      String(time || "").match(
        /^(\d{1,2}):(\d{2})$/
      );

    if (!match) return "";

    let hour = Number(match[1]);
    const minute = Number(match[2]);

    if (
      hour < 1 ||
      hour > 12 ||
      minute < 0 ||
      minute > 59
    ) {
      return "";
    }

    if (period === "AM") {
      if (hour === 12) hour = 0;
    } else if (hour !== 12) {
      hour += 12;
    }

    return `${String(hour).padStart(
      2,
      "0"
    )}:${String(minute).padStart(
      2,
      "0"
    )}`;
  }

  function openMeetingScheduler() {
    setShowMoreMenu(false);

    if (!workplace?._id) {
      setError(
        "Create a Workplace for this group before scheduling a meeting."
      );
      return;
    }

    setMeetingTitle("");
    setMeetingDescription("");
    setMeetingDate(
      getTodayDateInput()
    );
    setMeetingStartTime("");
    setMeetingStartPeriod("AM");
    setMeetingEndTime("");
    setMeetingEndPeriod("AM");
    setError("");
    setShowMeetingForm(true);
  }

  async function handleScheduleGroupMeeting(
    event
  ) {
    event.preventDefault();

    if (!workplace?._id) {
      setError(
        "Create a Workplace for this group before scheduling a meeting."
      );
      return;
    }

    const startTime =
      normalizeTimeTo24Hour(
        meetingStartTime,
        meetingStartPeriod
      );

    const endTime =
      normalizeTimeTo24Hour(
        meetingEndTime,
        meetingEndPeriod
      );

    if (!meetingTitle.trim()) {
      setError(
        "Meeting title is required."
      );
      return;
    }

    if (!meetingDate) {
      setError(
        "Select a meeting date."
      );
      return;
    }

    if (!startTime || !endTime) {
      setError(
        "Enter valid starting and ending times."
      );
      return;
    }

    const startAt =
      `${meetingDate}T${startTime}`;

    const endAt =
      `${meetingDate}T${endTime}`;

    if (
      new Date(endAt) <=
      new Date(startAt)
    ) {
      setError(
        "Ending time must be after starting time."
      );
      return;
    }

    try {
      setSchedulingMeeting(true);
      setError("");

      const res =
        await api.post(
          `/projects/${workplace._id}/meetings`,
          {
            title:
              meetingTitle.trim(),
            description:
              meetingDescription.trim(),
            startAt,
            endAt,
            participants:
              participants
                .map(getId)
                .filter(Boolean),
          }
        );

      const createdMeeting =
        res.data?.meeting;

      setShowMeetingForm(false);
      setShowAttachmentMenu(false);
      setMeetingTitle("");
      setMeetingDescription("");
      setMeetingDate("");
      setMeetingStartTime("");
      setMeetingEndTime("");

      const socket =
        socketRef.current;

      if (
        socket?.connected
      ) {
        socket.emit(
          "sendGroupMessage",
          {
            conversationId: id,
            text: `📅 Meeting scheduled: ${
              createdMeeting?.title ||
              meetingTitle.trim()
            }`,
          }
        );
      }
    } catch (err) {
      console.error(
        "Schedule group meeting error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to schedule meeting"
      );
    } finally {
      setSchedulingMeeting(
        false
      );
    }
  }

  async function openProjectFiles() {
    setShowAttachmentMenu(false);

    if (!workplace?._id) {
      setError(
        "Create a Workplace before sharing project files."
      );
      return;
    }

    try {
      setLoadingProjectFiles(true);
      setError("");

      const res =
        await api.get(
          `/projects/${workplace._id}`
        );

      setProjectFiles(
        Array.isArray(
          res.data?.project?.files
        )
          ? res.data.project.files
          : []
      );

      setProjectFileSearch("");
      setShowProjectFiles(true);
    } catch (err) {
      console.error(
        "Load project files error:",
        err
      );

      setProjectFiles([]);
      setError(
        err.response?.data?.message ||
          "Failed to load project files"
      );
    } finally {
      setLoadingProjectFiles(
        false
      );
    }
  }

  function sendProjectFile(
    projectFile
  ) {
    const socket =
      socketRef.current;

    if (!socket?.connected) {
      setError(
        "Not connected to the chat server."
      );
      return;
    }

    const path =
      projectFile?.path ||
      "Project file";

    socket.emit(
      "sendGroupMessage",
      {
        conversationId: id,
        text:
          `📁 Project file: ${path}\n` +
          `Open Workplace: /project/${workplace._id}`,
      }
    );

    setShowProjectFiles(false);
    setShowAttachmentMenu(false);
  }

  function handleAttachmentCategory(
    category
  ) {
    setShowAttachmentMenu(false);

    if (
      category === "document" ||
      category === "photo"
    ) {
      fileInputRef.current?.click();
      return;
    }

    setShowSimpleFeatureModal(
      category
    );
  }

  function handleSelectedChatFile(
    event
  ) {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    setShowSimpleFeatureModal(
      `"${file.name}" selected (${Math.max(
        1,
        Math.ceil(file.size / 1024)
      )} KB). Full upload storage will be connected next.`
    );
  }

  async function handleAISummary() {
    setShowMoreMenu(false);
    setShowAISummaryPrompt(false);
    setShowAISummary(true);
    setAISummary("");
    setAISummaryError("");

    if (!messages.length) {
      setAISummary(
        "There are no messages to summarize yet."
      );
      return;
    }

    try {
      setAISummaryLoading(true);

      const res =
        await api.post(
          `/conversations/${id}/ai-summary`
        );

      setAISummary(
        res.data?.summary ||
          "No summary was returned."
      );
    } catch (err) {
      console.error(
        "AI conversation summary error:",
        err
      );

      setAISummaryError(
        err.response?.data?.message ||
          "Failed to generate the AI summary."
      );
    } finally {
      setAISummaryLoading(
        false
      );
    }
  }

  function handleCreateWorkplaceFromMenu() {
    setShowMoreMenu(false);

    if (workplace?._id) {
      navigate(
        `/project/${workplace._id}`
      );
      return;
    }

    if (!isAdmin) {
      setError(
        "Only the group admin can create the Workplace."
      );
      return;
    }

    setWorkplaceName(
      `${conversation?.name || "Group"} Workspace`
    );

    setShowWorkplaceConfirm(true);
  }

  async function handleDeleteSelectedMessages() {
    const ids = selectedMessageIds.filter(Boolean);

    if (ids.length === 0) {
      setError(
        "Select at least one message to delete."
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Delete ${ids.length} selected message${
          ids.length === 1 ? "" : "s"
        }? This will remove them for everyone in this group.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingMessages(true);
      setError("");

      await api.delete(
        `/conversations/${id}/messages`,
        {
          data: {
            messageIds: ids,
          },
        }
      );

      setMessages((previous) =>
        previous.filter(
          (message) =>
            !ids.includes(
              getId(message?._id)
            )
        )
      );

      setSelectedMessageIds([]);
      setSelectionMode(false);

      window.dispatchEvent(
        new Event(
          "conversationsUpdated"
        )
      );
    } catch (err) {
      console.error(
        "Delete selected messages error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to delete selected messages"
      );
    } finally {
      setDeletingMessages(false);
    }
  }

  function handleClearChat() {
    setShowMoreMenu(false);

    setError(
      "Permanent Clear Chat needs a message-delete endpoint. It is not enabled yet."
    );
  }

  /*
   * =========================================================
   * BACK
   * =========================================================
   */

  function handleBack() {
    navigate("/");
  }

  /*
   * =========================================================
   * LOADING
   * =========================================================
   */

  if (loading) {
    return (
      <div className="h-full w-full bg-[#0f1117] flex items-center justify-center">
        <div className="text-center">
          <div className="w-9 h-9 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />

          <p className="text-gray-400 text-sm">
            Loading group...
          </p>
        </div>
      </div>
    );
  }

  /*
   * =========================================================
   * ERROR WITH NO GROUP
   * =========================================================
   */

  if (
    error &&
    !conversation
  ) {
    return (
      <div className="h-full w-full bg-[#0f1117] flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-5xl mb-4">
            👥
          </div>

          <p className="text-red-400 text-sm mb-5">
            {error}
          </p>

          <button
            onClick={
              handleBack
            }
            className="bg-accent hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
          >
            Back to Chats
          </button>
        </div>
      </div>
    );
  }

  const visibleMessages = chatSearch.trim()
    ? messages.filter((message) =>
        [
          message?.text,
          message?.senderName,
          message?.sender?.name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(
            chatSearch.trim().toLowerCase()
          )
      )
    : messages;

  return (
    <div className="h-full w-full bg-[#0f1117] text-white flex overflow-hidden">
      {/* =================================================== */}
      {/* MAIN GROUP CHAT */}
      {/* =================================================== */}

      <section
        className={`h-full min-w-0 flex flex-col ${
          showGroupInfo
            ? "w-full md:w-[calc(100%-410px)]"
            : "w-full"
        }`}
      >
        {/* HEADER */}
        <header className="h-16 shrink-0 border-b border-[#2a3942] bg-[#202c33] flex items-center px-3 md:px-4 gap-2">
          <button
            onClick={handleBack}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#2a3942] transition md:hidden"
            title="Back to chats"
          >
            ←
          </button>

          {/* GROUP PROFILE - CLICK TO OPEN GROUP INFO */}
          <button
            type="button"
            onClick={openGroupInfo}
            className="flex items-center gap-3 min-w-0 text-left rounded-xl px-2 py-1.5 hover:bg-[#2a3942] transition"
            title="Group info"
          >
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full bg-purple-600 overflow-hidden flex items-center justify-center text-white font-semibold">
                {groupAvatar ? (
                  <img
                    src={groupAvatar}
                    alt="Group"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  getInitial(
                    conversation?.name
                  )
                )}
              </div>

              {onlineMemberCount > 0 && (
                <span className="absolute right-0 bottom-0 w-3 h-3 rounded-full bg-green-400 border-2 border-[#202c33]" />
              )}
            </div>

            <div className="min-w-0">
              <h1 className="font-semibold truncate">
                {conversation?.name || "Group"}
              </h1>

              <p className="text-gray-400 text-xs truncate">
                {participants.length} member
                {participants.length === 1 ? "" : "s"}
                {onlineMemberCount > 0
                  ? ` • ${onlineMemberCount} online`
                  : ""}
              </p>
            </div>
          </button>

          <div className="ml-auto flex items-center gap-1">
            {/* Voice */}
            <button
              type="button"
              onClick={() =>
                setError(
                  "Voice calling will be added with WebRTC."
                )
              }
              className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-300 hover:text-white hover:bg-[#2a3942] transition text-lg"
              title="Voice call"
            >
              ☎
            </button>

            {/* Video */}
            <button
              type="button"
              onClick={() =>
                setError(
                  "Video calling will be added with WebRTC."
                )
              }
              className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-300 hover:text-white hover:bg-[#2a3942] transition text-lg"
              title="Video call"
            >
              ▣
            </button>

            {/* Search */}
            <button
              type="button"
              onClick={openChatSearch}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-300 hover:text-white hover:bg-[#2a3942] transition text-lg"
              title="Search"
            >
              🔍
            </button>

            {/* More menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setShowMoreMenu((previous) => !previous)
                }
                className={`w-10 h-10 rounded-full flex items-center justify-center text-gray-300 hover:text-white hover:bg-[#2a3942] transition ${
                  showMoreMenu ? "bg-[#2a3942] text-white" : ""
                }`}
                title="More"
                aria-label="More"
              >
                <span className="text-2xl leading-none mb-1">
                  ⋮
                </span>
              </button>

              {showMoreMenu && (
                <div
                  className="absolute right-0 top-11 z-[120] w-[250px] max-w-[calc(100vw-16px)] bg-[#202c33] rounded-md shadow-[0_8px_24px_rgba(0,0,0,0.45)] border border-[#2a3942] py-1 overflow-hidden"
                  role="menu"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      openGroupInfo();
                    }}
                    className="w-full h-7 px-3.5 flex items-center gap-2.5 text-left text-gray-100 hover:bg-[#2a3942] transition"
                    role="menuitem"
                  >
                    <span className="w-4 shrink-0 text-center text-gray-300 text-[14px]">
                      ⓘ
                    </span>
                    <span className="text-[12px] font-normal">
                      Group info
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={openAddMemberSection}
                    className="w-full h-7 px-3.5 flex items-center gap-2.5 text-left text-gray-100 hover:bg-[#2a3942] transition"
                    role="menuitem"
                  >
                    <span className="w-4 shrink-0 text-center text-gray-300 text-[13px] leading-none">
                      +
                    </span>
                    <span className="text-[12px] font-normal">
                      Add member
                    </span>
                  </button>

                  <div className="my-1 border-t border-[#2a3942]" />

<button
                    type="button"
                    onClick={handleCreateWorkplaceFromMenu}
                    className="w-full h-7 px-3.5 flex items-center gap-2.5 text-left text-gray-100 hover:bg-[#2a3942] transition"
                    role="menuitem"
                  >
                    <span className="w-4 shrink-0 text-center text-gray-300 text-[13px]">
                      ▣
                    </span>

                    <span className="text-[12px] font-medium">
                      {workplace
                        ? "Open Workplace"
                        : "Create Workplace"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={openProjectFiles}
                    className={`w-full h-7 px-3.5 flex items-center gap-2.5 text-left transition ${
                      workplace
                        ? "text-gray-100 hover:bg-[#2a3942]"
                        : "text-gray-500 hover:bg-[#1d272d]"
                    }`}
                    role="menuitem"
                  >
                    <span className="w-4 shrink-0 text-center text-gray-300 text-[13px]">
                      📁
                    </span>
                    <span className="text-[12px] font-normal">
                      Project files
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={openChatSearch}
                    className="w-full h-7 px-3.5 flex items-center gap-2.5 text-left text-gray-100 hover:bg-[#2a3942] transition"
                    role="menuitem"
                  >
                    <span className="w-4 shrink-0 text-center text-gray-300 text-[14px]">
                      ⌕
                    </span>
                    <span className="text-[12px] font-normal">
                      Search
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleSelectionMode}
                    className="w-full h-7 px-3.5 flex items-center gap-2.5 text-left text-gray-100 hover:bg-[#2a3942] transition"
                    role="menuitem"
                  >
                    <span className="w-4 shrink-0 text-center text-gray-300 text-[13px]">
                      ☑
                    </span>
                    <span className="text-[12px] font-normal">
                      Select messages
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleMuteNotifications}
                    className="w-full h-7 px-3.5 flex items-center justify-between gap-2.5 text-left text-gray-100 hover:bg-[#2a3942] transition"
                    role="menuitem"
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <span className="w-4 shrink-0 text-center text-gray-300 text-[13px]">
                        ⌁
                      </span>

                      <span className="text-[12px] font-normal truncate">
                        {mutedNotifications
                          ? "Unmute notifications"
                          : "Mute notifications"}
                      </span>
                    </span>

                    {mutedNotifications && (
                      <span className="text-[11px] text-gray-500 shrink-0">
                        On
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={toggleDisappearingMessages}
                    className="w-full h-7 px-3.5 flex items-center justify-between gap-2.5 text-left text-gray-100 hover:bg-[#2a3942] transition"
                    role="menuitem"
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <span className="w-4 shrink-0 text-center text-gray-300 text-[13px]">
                        ◔
                      </span>

                      <span className="text-[12px] font-normal truncate">
                        Disappearing messages
                      </span>
                    </span>

                    <span className="text-[11px] text-gray-500 shrink-0">
                      {disappearingMessages
                        ? "On"
                        : "Off"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleFavorite}
                    className="w-full h-7 px-3.5 flex items-center gap-2.5 text-left text-gray-100 hover:bg-[#2a3942] transition"
                    role="menuitem"
                  >
                    <span className="w-4 shrink-0 text-center text-gray-300 text-[14px]">
                      {isFavorite ? "♥" : "♡"}
                    </span>

                    <span className="text-[12px] font-normal">
                      {isFavorite
                        ? "Remove from favourites"
                        : "Add to favourites"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={addToList}
                    className="w-full h-7 px-3.5 flex items-center gap-2.5 text-left text-gray-100 hover:bg-[#2a3942] transition"
                    role="menuitem"
                  >
                    <span className="w-4 shrink-0 text-center text-gray-300 text-[13px]">
                      ▣
                    </span>

                    <span className="text-[12px] font-normal">
                      Add to list
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={exportChat}
                    className="w-full h-7 px-3.5 flex items-center gap-2.5 text-left text-gray-100 hover:bg-[#2a3942] transition"
                    role="menuitem"
                  >
                    <span className="w-4 shrink-0 text-center text-gray-300 text-[14px]">
                      ⇩
                    </span>

                    <span className="text-[12px] font-normal">
                      Export chat
                    </span>
                  </button>

                  <div className="my-1 border-t border-[#2a3942]" />

                  

                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      navigate("/");
                    }}
                    className="w-full h-7 px-3.5 flex items-center gap-2.5 text-left text-gray-100 hover:bg-[#2a3942] transition"
                    role="menuitem"
                  >
                    <span className="w-4 shrink-0 text-center text-gray-300 text-[14px]">
                      ×
                    </span>

                    <span className="text-[12px] font-normal">
                      Close chat
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearChat}
                    className="w-full h-7 px-3.5 flex items-center gap-2.5 text-left text-red-300 hover:bg-red-500/10 transition"
                    role="menuitem"
                  >
                    <span className="w-4 shrink-0 text-center text-red-300 text-[14px]">
                      ⊖
                    </span>

                    <span className="text-[12px] font-normal">
                      Clear chat
                    </span>
                  </button>

                  {!isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMoreMenu(false);
                        handleLeaveGroup();
                      }}
                      className="w-full h-7 px-3.5 flex items-center gap-2.5 text-left text-red-300 hover:bg-red-500/10 transition"
                      role="menuitem"
                    >
                      <span className="w-4 shrink-0 text-center text-red-300 text-[14px]">
                        ⇥
                      </span>

                      <span className="text-[12px] font-normal">
                        Exit group
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {chatSearchOpen && (
          <div className="shrink-0 border-b border-[#2a3942] bg-[#111b21] px-4 py-3">
            <div className="max-w-4xl mx-auto flex items-center gap-2">
              <span className="text-gray-500">
                🔍
              </span>

              <input
                autoFocus
                value={chatSearch}
                onChange={(event) =>
                  setChatSearch(
                    event.target.value
                  )
                }
                placeholder="Search messages in this group..."
                className="flex-1 bg-[#202c33] text-white rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-accent text-sm"
              />

              <button
                type="button"
                onClick={() => {
                  setChatSearch("");
                  setChatSearchOpen(false);
                }}
                className="text-xs text-gray-400 hover:text-white px-2"
              >
                Close
              </button>
            </div>

            {chatSearch.trim() && (
              <p className="max-w-4xl mx-auto text-[11px] text-gray-600 mt-2">
                {messages.filter((message) =>
                  [
                    message?.text,
                    message?.senderName,
                    message?.sender?.name,
                  ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase()
                    .includes(
                      chatSearch.trim().toLowerCase()
                    )
                ).length}{" "}
                matching message
                {messages.filter((message) =>
                  [
                    message?.text,
                    message?.senderName,
                    message?.sender?.name,
                  ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase()
                    .includes(
                      chatSearch.trim().toLowerCase()
                    )
                ).length === 1
                  ? ""
                  : "s"}
              </p>
            )}
          </div>
        )}

        {selectionMode && (
          <div className="shrink-0 border-b border-[#2a3942] bg-[#202c33] px-4 py-2.5">
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
              <span className="text-sm">
                {selectedMessageIds.length === 0
                  ? "Select messages"
                  : `${selectedMessageIds.length} selected`}
              </span>

              <div className="flex items-center gap-2">
                {selectedMessageIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDeleteSelectedMessages}
                    disabled={deletingMessages}
                    className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-300 hover:bg-red-500/20 disabled:opacity-50 text-xs font-medium"
                  >
                    {deletingMessages
                      ? "Deleting..."
                      : "Delete"}
                  </button>
                )}

                {selectedMessageIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setError(
                        "Forwarding selected messages will be connected next."
                      );
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#111b21] text-xs hover:bg-[#2a3942]"
                  >
                    Forward
                  </button>
                )}

                <button
                  type="button"
                  onClick={cancelMessageSelection}
                  disabled={deletingMessages}
                  className="px-3 py-1.5 rounded-lg bg-[#111b21] text-xs hover:bg-[#2a3942] disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MESSAGES */}
        <div className="relative flex-1 overflow-y-auto p-4 md:p-5">
          {showAISummaryPrompt && conversation && (
            <div className="absolute top-4 right-4 z-30 w-[270px] max-w-[calc(100%-2rem)]">
              <div className="rounded-xl border border-[#3d3158] bg-[#202c33] shadow-[0_10px_30px_rgba(0,0,0,0.35)] overflow-hidden">
                <button
                  type="button"
                  onClick={handleAISummary}
                  className="w-full px-4 py-3 text-left hover:bg-[#2a3942] transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500/15 text-purple-300 flex items-center justify-center text-sm shrink-0">
                      ✦
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium text-gray-100">
                        Summarize this chat with AI
                      </p>

                      <p className="text-[11px] text-gray-500 mt-1 leading-4">
                        Tap here to get the latest group discussion, decisions and action items.
                      </p>
                    </div>

                    <span className="text-gray-500 text-xs mt-1">
                      →
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setShowAISummaryPrompt(false)
                  }
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md text-gray-500 hover:text-white hover:bg-[#2a3942] text-xs"
                  title="Dismiss"
                >
                  ×
                </button>
              </div>
            </div>
          )}
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-[#202c33] flex items-center justify-center text-3xl mx-auto mb-4">
                  👥
                </div>

                <p className="text-gray-300 font-medium">
                  No group messages yet
                </p>

                <p className="text-gray-600 text-sm mt-1">
                  Send a message to start the conversation.
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-3">
              {visibleMessages.map((message) => {
                const senderId = getId(message?.sender);
                const isOwn =
                  senderId === currentUserId;

                const messageId =
                  getId(message?._id);

                const createdAt = message?.createdAt
                  ? new Date(message.createdAt)
                  : null;

                const time =
                  createdAt &&
                  !Number.isNaN(createdAt.getTime())
                    ? createdAt.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "";

                return (
                  <div
                    key={
                      messageId ||
                      `${senderId}-${message.createdAt}-${message.text}`
                    }
                    className={`flex ${
                      isOwn
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <button
                      type="button"
                      disabled={!selectionMode}
                      onClick={() =>
                        selectionMode &&
                        toggleMessageSelection(messageId)
                      }
                      className={`text-left rounded-2xl ${
                        selectedMessageIds.includes(messageId)
                          ? "ring-2 ring-blue-500/70"
                          : ""
                      }`}
                    >
                    <div
                      className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2 ${
                        isOwn
                          ? "bg-accent text-white rounded-br-sm"
                          : "bg-[#202c33] text-gray-100 rounded-bl-sm"
                      }`}
                    >
                      {!isOwn && (
                        <p className="text-xs text-purple-400 mb-1 font-medium">
                          {message?.senderName ||
                            message?.sender?.name ||
                            "User"}
                        </p>
                      )}

                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message?.text || ""}
                      </p>

                      {time && (
                        <p
                          className={`text-[10px] mt-1 ${
                            isOwn
                              ? "text-blue-100"
                              : "text-gray-600"
                          }`}
                        >
                          {time}
                        </p>
                      )}
                    </div>
                    </button>
                  </div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ERROR */}
        {error && conversation && (
          <div className="px-4 md:px-5">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="text-red-400 text-xs">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() => setError("")}
                  className="text-gray-600 hover:text-gray-300 text-xs"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* INPUT */}
        <form
          onSubmit={handleSend}
          className="shrink-0 border-t border-[#2a3942] bg-[#202c33] p-3 md:p-4"
        >
          <div className="max-w-4xl mx-auto flex gap-2 md:gap-3">
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() =>
                  setShowAttachmentMenu(
                    (previous) =>
                      !previous
                  )
                }
                className="w-11 h-11 rounded-xl bg-[#111b21] text-gray-300 hover:text-white hover:bg-[#2a3942] transition"
                title="Attach"
              >
                📎
              </button>

              {showAttachmentMenu && (
                <div className="absolute left-0 bottom-12 z-[120] w-[250px] bg-[#202c33] border border-[#2a3942] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.45)] p-2">
                  {[
                    ["document", "📄", "Document"],
                    ["photo", "🖼️", "Photos & videos"],
                    ["camera", "📷", "Camera"],
                    ["audio", "🎧", "Audio"],
                    ["contact", "👤", "Contact"],
                    ["poll", "📊", "Poll"],
                    ["event", "📅", "Event"],
                    ["sticker", "😀", "New sticker"],
                  ].map(
                    ([
                      key,
                      icon,
                      label,
                    ]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          handleAttachmentCategory(
                            key
                          )
                        }
                        className="w-full h-9 px-3 rounded-lg flex items-center gap-3 text-left text-[12px] text-gray-100 hover:bg-[#2a3942]"
                      >
                        <span className="w-5 text-center">
                          {icon}
                        </span>
                        <span>
                          {label}
                        </span>
                      </button>
                    )
                  )}

                  <div className="my-2 border-t border-[#2a3942]" />

                  <button
                    type="button"
                    onClick={openProjectFiles}
                    className={`w-full h-9 px-3 rounded-lg flex items-center gap-3 text-left text-[12px] ${
                      workplace
                        ? "text-blue-300 hover:bg-[#2a3942]"
                        : "text-gray-500 hover:bg-[#1d272d]"
                    }`}
                  >
                    <span className="w-5 text-center">
                      📁
                    </span>
                    <span>
                      Project files
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={openMeetingScheduler}
                    disabled={!workplace}
                    className={`w-full h-9 px-3 rounded-lg flex items-center gap-3 text-left text-[12px] ${
                      workplace
                        ? "text-gray-100 hover:bg-[#2a3942]"
                        : "text-gray-500 cursor-not-allowed"
                    }`}
                    title={
                      workplace
                        ? "Schedule a Workplace meeting"
                        : "Create a Workplace first"
                    }
                  >
                    <span className="w-5 text-center">
                      📅
                    </span>

                    <span>
                      Schedule meeting
                    </span>

                    {!workplace && (
                      <span className="ml-auto text-[10px] text-gray-600">
                        Workplace required
                      </span>
                    )}
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleSelectedChatFile}
                  />
                </div>
              )}
            </div>

            <input
              value={text}
              onChange={(e) =>
                setText(e.target.value)
              }
              placeholder={`Message ${
                conversation?.name || "group"
              }...`}
              disabled={!socketConnected}
              autoComplete="off"
              className="flex-1 min-w-0 bg-[#111b21] text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-accent text-sm disabled:opacity-50"
            />

            <button
              type="submit"
              disabled={
                sending ||
                !text.trim() ||
                !socketConnected
              }
              className="bg-accent hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 md:px-5 rounded-xl text-sm font-medium transition shrink-0"
            >
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        </form>
      </section>


      {/* =================================================== */}
      {/* PROJECT FILES */}
      {/* =================================================== */}

      {showProjectFiles && (
        <div className="fixed inset-0 z-[125] bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-[#111b21] border border-[#2a3942] rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#2a3942] flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-lg">
                  Project files
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Share files from {workplace?.name || "the Workplace"}.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowProjectFiles(false)
                }
                className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#202c33]"
              >
                ×
              </button>
            </div>

            <div className="p-5">
              <input
                value={projectFileSearch}
                onChange={(event) =>
                  setProjectFileSearch(
                    event.target.value
                  )
                }
                placeholder="Search project files"
                className="w-full bg-[#202c33] border border-[#33414a] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
              />

              <div className="mt-4 max-h-80 overflow-y-auto space-y-2">
                {loadingProjectFiles ? (
                  <p className="text-sm text-gray-500 text-center py-8">
                    Loading project files...
                  </p>
                ) : (
                  projectFiles
                    .filter((file) =>
                      (
                        file?.path ||
                        ""
                      )
                        .toLowerCase()
                        .includes(
                          projectFileSearch
                            .trim()
                            .toLowerCase()
                        )
                    )
                    .map(
                      (
                        file,
                        index
                      ) => (
                        <button
                          key={
                            file?._id ||
                            file?.path ||
                            index
                          }
                          type="button"
                          onClick={() =>
                            sendProjectFile(
                              file
                            )
                          }
                          className="w-full p-3 rounded-xl bg-[#202c33] hover:bg-[#2a3942] text-left flex items-center gap-3"
                        >
                          <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-300 flex items-center justify-center text-[10px] font-semibold">
                            {(
                              file?.path ||
                              "FILE"
                            )
                              .split(".")
                              .pop()
                              .slice(
                                0,
                                4
                              )
                              .toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <p className="text-sm text-gray-100 truncate">
                              {
                                file?.path
                              }
                            </p>
                            <p className="text-[11px] text-gray-500">
                              Share project reference in group
                            </p>
                          </div>
                        </button>
                      )
                    )
                )}

                {!loadingProjectFiles &&
                  projectFiles.filter(
                    (file) =>
                      (
                        file?.path ||
                        ""
                      )
                        .toLowerCase()
                        .includes(
                          projectFileSearch
                            .trim()
                            .toLowerCase()
                        )
                  ).length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-8">
                      No project files found.
                    </p>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================== */}
      {/* AI SUMMARY */}
      {/* =================================================== */}

      {showAISummary && (
        <div className="fixed inset-0 z-[126] bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#111b21] border border-[#2a3942] rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#2a3942] flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-lg">
                  🤖 AI Summary
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Summary of the latest group conversation.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowAISummary(false)
                }
                className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#202c33]"
              >
                ×
              </button>
            </div>

            <div className="p-5">
              {aiSummaryLoading ? (
                <div className="py-12 text-center">
                  <div className="w-9 h-9 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-gray-300">
                    AI is summarizing the group...
                  </p>
                </div>
              ) : aiSummaryError ? (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4">
                  <p className="text-sm text-red-300">
                    {aiSummaryError}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl bg-[#202c33] border border-[#2a3942] p-4">
                  <p className="text-sm text-gray-200 whitespace-pre-wrap leading-6">
                    {aiSummary ||
                      "No summary available."}
                  </p>
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-[#2a3942] flex justify-end gap-2">
              <button
                type="button"
                onClick={handleAISummary}
                disabled={aiSummaryLoading}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-sm text-white"
              >
                {aiSummaryLoading
                  ? "Working..."
                  : "Refresh"}
              </button>

              <button
                type="button"
                onClick={() =>
                  setShowAISummary(false)
                }
                className="px-4 py-2.5 rounded-xl bg-[#202c33] hover:bg-[#2a3942] text-sm text-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================== */}
      {/* SCHEDULE MEETING */}
      {/* =================================================== */}

      {showMeetingForm && (
        <div className="fixed inset-0 z-[127] bg-black/75 flex items-center justify-center p-4">
          <form
            onSubmit={
              handleScheduleGroupMeeting
            }
            className="w-full max-w-lg bg-[#111b21] border border-[#2a3942] rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-[#2a3942] flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-lg">
                  Schedule meeting
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Group members will be added to the Workplace meeting.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowMeetingForm(false)
                }
                className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#202c33]"
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-4">
              <input
                value={meetingTitle}
                onChange={(event) =>
                  setMeetingTitle(
                    event.target.value
                  )
                }
                placeholder="Meeting title"
                className="w-full bg-[#202c33] border border-[#33414a] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
              />

              <textarea
                value={meetingDescription}
                onChange={(event) =>
                  setMeetingDescription(
                    event.target.value
                  )
                }
                placeholder="Agenda / description"
                rows={3}
                className="w-full resize-none bg-[#202c33] border border-[#33414a] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
              />

              <div>
                <label className="block text-xs text-gray-500 mb-2">
                  Meeting date
                </label>

                <input
                  type="date"
                  value={meetingDate}
                  min={getTodayDateInput()}
                  onChange={(event) =>
                    setMeetingDate(
                      event.target.value
                    )
                  }
                  className="w-full bg-[#202c33] border border-[#33414a] rounded-xl px-4 py-3 text-sm text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-2">
                    Starting time
                  </label>

                  <div className="grid grid-cols-[1fr_72px] gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={5}
                      value={meetingStartTime}
                      onChange={(event) =>
                        setMeetingStartTime(
                          event.target.value
                        )
                      }
                      placeholder="05:30"
                      className="w-full bg-[#202c33] border border-[#33414a] rounded-xl px-3 py-3 text-sm text-white outline-none focus:border-blue-500"
                    />

                    <select
                      value={meetingStartPeriod}
                      onChange={(event) =>
                        setMeetingStartPeriod(
                          event.target.value
                        )
                      }
                      className="w-full bg-[#202c33] border border-[#33414a] rounded-xl px-2 py-3 text-sm text-white outline-none"
                    >
                      <option value="AM">
                        AM
                      </option>
                      <option value="PM">
                        PM
                      </option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-2">
                    Ending time
                  </label>

                  <div className="grid grid-cols-[1fr_72px] gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={5}
                      value={meetingEndTime}
                      onChange={(event) =>
                        setMeetingEndTime(
                          event.target.value
                        )
                      }
                      placeholder="06:30"
                      className="w-full bg-[#202c33] border border-[#33414a] rounded-xl px-3 py-3 text-sm text-white outline-none focus:border-blue-500"
                    />

                    <select
                      value={meetingEndPeriod}
                      onChange={(event) =>
                        setMeetingEndPeriod(
                          event.target.value
                        )
                      }
                      className="w-full bg-[#202c33] border border-[#33414a] rounded-xl px-2 py-3 text-sm text-white outline-none"
                    >
                      <option value="AM">
                        AM
                      </option>
                      <option value="PM">
                        PM
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3">
                <p className="text-xs text-blue-200">
                  📌 {workplace?.name}
                </p>
                <p className="text-[11px] text-gray-500 mt-1">
                  {participants.length} member
                  {participants.length === 1
                    ? ""
                    : "s"} will be invited.
                </p>
              </div>

              {error && (
                <p className="text-xs text-red-400">
                  {error}
                </p>
              )}
            </div>

            <div className="px-5 py-4 border-t border-[#2a3942] flex justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setShowMeetingForm(false)
                }
                disabled={schedulingMeeting}
                className="px-4 py-2.5 rounded-xl bg-[#202c33] hover:bg-[#2a3942] disabled:opacity-50 text-sm text-gray-200"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  schedulingMeeting ||
                  !meetingTitle.trim() ||
                  !meetingDate ||
                  !meetingStartTime ||
                  !meetingEndTime
                }
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-sm font-medium text-white"
              >
                {schedulingMeeting
                  ? "Scheduling..."
                  : "Schedule meeting"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =================================================== */}
      {/* SIMPLE ATTACHMENT INFO */}
      {/* =================================================== */}

      {showSimpleFeatureModal && (
        <div className="fixed inset-0 z-[128] bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#111b21] border border-[#2a3942] rounded-2xl shadow-2xl p-5">
            <h3 className="font-semibold text-lg">
              Attachment
            </h3>

            <p className="text-sm text-gray-400 mt-2">
              {showSimpleFeatureModal}
            </p>

            <div className="flex justify-end mt-5">
              <button
                type="button"
                onClick={() =>
                  setShowSimpleFeatureModal("")
                }
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-sm text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================== */}
      {/* GROUP INFO SIDE PANEL */}
      {/* =================================================== */}

      {showGroupInfo && (
        <aside className="fixed inset-0 md:static md:h-full md:w-[410px] shrink-0 bg-[#111b21] border-l border-[#2a3942] z-[90] flex flex-col">
          {/* GROUP INFO HEADER */}
          <div className="h-16 shrink-0 border-b border-[#2a3942] bg-[#202c33] flex items-center px-4">
            <button
              type="button"
              onClick={() =>
                setShowGroupInfo(false)
              }
              className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-300 hover:bg-[#2a3942] hover:text-white mr-2"
              title="Close group info"
            >
              ←
            </button>

            <div>
              <h2 className="font-semibold">
                Group info
              </h2>

              <p className="text-xs text-gray-500">
                {participants.length} member
                {participants.length === 1
                  ? ""
                  : "s"}
              </p>
            </div>
          </div>

          {/* SCROLLABLE INFO */}
          <div className="flex-1 overflow-y-auto">
            {/* HERO */}
            <div className="px-5 py-7 bg-[#111b21] flex flex-col items-center">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    if (isAdmin) {
                      profileFileInputRef.current?.click();
                    }
                  }}
                  className="w-28 h-28 rounded-full bg-purple-600 overflow-hidden flex items-center justify-center text-white text-4xl font-semibold shadow-lg"
                  title={
                    isAdmin
                      ? "Change group photo"
                      : "Only the admin can edit group info"
                  }
                >
                  {groupAvatar ? (
                    <img
                      src={groupAvatar}
                      alt="Group"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    getInitial(
                      conversation?.name
                    )
                  )}
                </button>

                {isAdmin && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        profileFileInputRef.current?.click()
                      }
                      className="absolute right-0 bottom-0 w-9 h-9 rounded-full bg-[#202c33] border border-[#3b4a54] text-white flex items-center justify-center text-sm hover:bg-[#2a3942]"
                      title="Change group photo"
                    >
                      ✎
                    </button>

                    <input
                      ref={profileFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={
                        handleGroupAvatarChange
                      }
                      className="hidden"
                    />
                  </>
                )}
              </div>

              {/* WhatsApp-style inline group name editing */}
              <div className="mt-4 w-full max-w-[320px]">
                {editingGroupName ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={editGroupName}
                      onChange={(event) =>
                        setEditGroupName(
                          event.target.value
                        )
                      }
                      maxLength={100}
                      className="flex-1 min-w-0 bg-[#202c33] border-b-2 border-blue-500 px-2 py-1 text-xl text-white text-center outline-none"
                    />

                    <button
                      type="button"
                      onClick={saveGroupNameInline}
                      disabled={renameLoading}
                      className="w-9 h-9 rounded-full text-green-400 hover:bg-[#202c33] disabled:opacity-50"
                      title="Save group name"
                    >
                      ✓
                    </button>

                    <button
                      type="button"
                      onClick={cancelEditGroupName}
                      disabled={renameLoading}
                      className="w-9 h-9 rounded-full text-gray-400 hover:bg-[#202c33] disabled:opacity-50"
                      title="Cancel"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <h3 className="text-2xl font-semibold text-center break-words">
                      {conversation?.name || "Group"}
                    </h3>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={startEditGroupName}
                        className="text-gray-500 hover:text-white shrink-0"
                        title="Edit group name"
                      >
                        ✎
                      </button>
                    )}
                  </div>
                )}
              </div>

              <p className="text-sm text-gray-500 mt-1">
                {participants.length} member
                {participants.length === 1
                  ? ""
                  : "s"}
                {onlineMemberCount > 0
                  ? ` • ${onlineMemberCount} online`
                  : ""}
              </p>

              <div className="flex items-center justify-center gap-6 mt-6">
                <button
                  type="button"
                  onClick={() =>
                    setError(
                      "Voice calling will be added with WebRTC."
                    )
                  }
                  className="flex flex-col items-center gap-2 text-green-400 hover:text-green-300"
                >
                  <span className="w-12 h-12 rounded-full bg-[#202c33] flex items-center justify-center text-xl">
                    ☎
                  </span>
                  <span className="text-xs text-gray-300">
                    Voice
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setError(
                      "Video calling will be added with WebRTC."
                    )
                  }
                  className="flex flex-col items-center gap-2 text-green-400 hover:text-green-300"
                >
                  <span className="w-12 h-12 rounded-full bg-[#202c33] flex items-center justify-center text-xl">
                    ▣
                  </span>
                  <span className="text-xs text-gray-300">
                    Video
                  </span>
                </button>

                <button
                  type="button"
                  onClick={openAddMemberSection}
                  className="flex flex-col items-center gap-2 text-green-400 hover:text-green-300"
                >
                  <span className="w-12 h-12 rounded-full bg-[#202c33] flex items-center justify-center text-xl">
                    +
                  </span>
                  <span className="text-xs text-gray-300">
                    Add
                  </span>
                </button>

                <button
                  type="button"
                  onClick={openChatSearch}
                  className="flex flex-col items-center gap-2 text-green-400 hover:text-green-300"
                >
                  <span className="w-12 h-12 rounded-full bg-[#202c33] flex items-center justify-center text-xl">
                    🔍
                  </span>
                  <span className="text-xs text-gray-300">
                    Search
                  </span>
                </button>
              </div>
            </div>

            {/* DESCRIPTION */}
            <div className="border-y border-[#2a3942] bg-[#111b21]">
              <div className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      Group description
                    </p>

                    {editingGroupDescription ? (
                      <div className="mt-2">
                        <textarea
                          autoFocus
                          value={editGroupDescription}
                          onChange={(event) =>
                            setEditGroupDescription(
                              event.target.value
                            )
                          }
                          maxLength={500}
                          rows={3}
                          className="w-full resize-none bg-[#202c33] border-b-2 border-blue-500 px-2 py-2 text-sm text-gray-200 outline-none"
                          placeholder="Add a group description"
                        />

                        <div className="flex items-center justify-end gap-2 mt-2">
                          <span className="text-[11px] text-gray-600 mr-auto">
                            {editGroupDescription.length}/500
                          </span>

                          <button
                            type="button"
                            onClick={cancelEditGroupDescription}
                            className="text-xs text-gray-400 hover:text-white px-2 py-1"
                          >
                            Cancel
                          </button>

                          <button
                            type="button"
                            onClick={saveGroupDescriptionInline}
                            className="text-xs text-green-400 hover:text-green-300 px-2 py-1 font-medium"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-300 mt-2 whitespace-pre-wrap break-words">
                        {groupDescription ||
                          "No group description added yet."}
                      </p>
                    )}
                  </div>

                  {isAdmin && !editingGroupDescription && (
                    <button
                      type="button"
                      onClick={startEditGroupDescription}
                      className="text-gray-500 hover:text-white shrink-0"
                      title="Edit group description"
                    >
                      ✎
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* SHARED CONTENT */}
            <div className="px-5 py-4 border-b border-[#2a3942]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">
                  Media, links and docs
                </h3>

                <span className="text-xs text-gray-500">
                  {sharedMedia.length +
                    sharedLinks.length +
                    sharedDocuments.length}
                </span>
              </div>

              {/* MEDIA */}
              <div className="rounded-xl bg-[#202c33] p-3 mb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">
                      🖼️
                    </span>
                    <div>
                      <p className="text-sm">
                        Media
                      </p>
                      <p className="text-xs text-gray-500">
                        Photos and videos
                      </p>
                    </div>
                  </div>

                  <span className="text-xs text-gray-500">
                    {sharedMedia.length}
                  </span>
                </div>
              </div>

              {/* LINKS */}
              <div className="rounded-xl bg-[#202c33] p-3 mb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">
                      🔗
                    </span>
                    <div>
                      <p className="text-sm">
                        Links
                      </p>
                      <p className="text-xs text-gray-500">
                        Links shared in this group
                      </p>
                    </div>
                  </div>

                  <span className="text-xs text-gray-500">
                    {sharedLinks.length}
                  </span>
                </div>

                {sharedLinks.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {sharedLinks.slice(0, 5).map(
                      (item, index) => (
                        <a
                          key={`${item.url}-${index}`}
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-xs text-blue-400 hover:text-blue-300 truncate"
                        >
                          {item.url}
                        </a>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* DOCUMENTS */}
              <div className="rounded-xl bg-[#202c33] p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">
                      📄
                    </span>
                    <div>
                      <p className="text-sm">
                        Documents
                      </p>
                      <p className="text-xs text-gray-500">
                        Files shared in this group
                      </p>
                    </div>
                  </div>

                  <span className="text-xs text-gray-500">
                    {sharedDocuments.length}
                  </span>
                </div>
              </div>
            </div>

            {/* MEMBERS */}
            <div className="px-5 py-5 border-b border-[#2a3942]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">
                  Members
                </h3>

                <span className="text-xs text-gray-500">
                  {participants.length}
                </span>
              </div>

              <div className="space-y-2">
                {participants.map(
                  (member) => {
                    const memberId =
                      getId(member);

                    const memberIsAdmin =
                      getId(
                        conversation?.createdBy
                      ) === memberId;

                    const online =
                      Boolean(
                        memberOnline[
                          memberId
                        ]
                      );

                    return (
                      <div
                        key={memberId}
                        className="flex items-center gap-3 py-2"
                      >
                        <div className="relative shrink-0">
                          <div className="w-11 h-11 rounded-full bg-accent flex items-center justify-center font-semibold">
                            {getInitial(
                              member.name
                            )}
                          </div>

                          <span
                            className={`absolute right-0 bottom-0 w-3 h-3 rounded-full border-2 border-[#111b21] ${
                              online
                                ? "bg-green-400"
                                : "bg-gray-600"
                            }`}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm truncate">
                              {member.name}
                              {memberId ===
                                currentUserId &&
                                " (You)"}
                            </p>

                            {memberIsAdmin && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                                Admin
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-gray-500">
                            {online
                              ? "Online"
                              : "Offline"}
                          </p>
                        </div>

                        {isAdmin &&
                          !memberIsAdmin && (
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveMember(
                                  member
                                )
                              }
                              disabled={
                                removingMemberId ===
                                memberId
                              }
                              className="text-xs text-red-400 hover:bg-red-500/10 rounded-lg px-2 py-1.5 disabled:opacity-50"
                            >
                              {removingMemberId ===
                              memberId
                                ? "..."
                                : "Remove"}
                            </button>
                          )}
                      </div>
                    );
                  }
                )}
              </div>
            </div>

            {/* ADMIN / ADD MEMBER */}
            {isAdmin && (
              <div
                id="group-add-member-section"
                className="px-5 py-5 border-b border-[#2a3942]"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-medium">
                      Add Member
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Add another person to this group.
                    </p>
                  </div>

                  <span className="text-xs text-gray-600">
                    Admin only
                  </span>
                </div>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    🔍
                  </span>

                  <input
                    value={addMemberQuery}
                    onChange={searchMembers}
                    placeholder="Search users..."
                    className="w-full bg-[#202c33] text-white rounded-xl py-3 pl-11 pr-4 outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {searchingMembers && (
                  <p className="text-xs text-gray-500 mt-2">
                    Searching...
                  </p>
                )}

                {addMemberResults.length > 0 && (
                  <div className="mt-2 bg-[#202c33] border border-[#2a3942] rounded-xl overflow-hidden">
                    {addMemberResults
                      .slice(0, 5)
                      .map((searchUser) => {
                        const selected =
                          selectedAddMember?._id ===
                          searchUser._id;

                        return (
                          <button
                            key={
                              searchUser._id
                            }
                            type="button"
                            onClick={() =>
                              setSelectedAddMember(
                                searchUser
                              )
                            }
                            className={`w-full text-left flex items-center gap-3 px-3 py-3 hover:bg-[#344650] ${
                              selected
                                ? "bg-purple-600/20"
                                : ""
                            }`}
                          >
                            <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center font-semibold shrink-0">
                              {getInitial(
                                searchUser.name
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-white truncate">
                                {searchUser.name}
                              </p>

                              <p className="text-xs text-gray-500 truncate">
                                {searchUser.email}
                              </p>
                            </div>

                            {selected && (
                              <span className="text-green-400">
                                ✓
                              </span>
                            )}
                          </button>
                        );
                      })}
                  </div>
                )}

                {selectedAddMember && (
                  <button
                    type="button"
                    onClick={handleAddMember}
                    disabled={addMemberLoading}
                    className="w-full mt-3 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium"
                  >
                    {addMemberLoading
                      ? "Adding..."
                      : `Add ${selectedAddMember.name}`}
                  </button>
                )}
              </div>
            )}

            {/* SETTINGS */}
            <div className="px-5 py-5 border-b border-[#2a3942]">
              <h3 className="text-sm font-medium mb-3">
                Settings
              </h3>

              <div className="rounded-xl bg-[#202c33] divide-y divide-[#2a3942]">
                <button
                  type="button"
                  onClick={() =>
                    setError(
                      "Notification settings are coming next."
                    )
                  }
                  className="w-full px-4 py-4 flex items-center gap-3 text-left hover:bg-[#2a3942]"
                >
                  <span>🔔</span>
                  <div>
                    <p className="text-sm">
                      Notification settings
                    </p>
                    <p className="text-xs text-gray-500">
                      Control group notifications
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setError(
                      "Disappearing messages are coming next."
                    )
                  }
                  className="w-full px-4 py-4 flex items-center gap-3 text-left hover:bg-[#2a3942]"
                >
                  <span>⏱️</span>
                  <div>
                    <p className="text-sm">
                      Disappearing messages
                    </p>
                    <p className="text-xs text-gray-500">
                      Currently off
                    </p>
                  </div>
                </button>

                <div className="px-4 py-4 flex items-center gap-3">
                  <span>🔒</span>
                  <div>
                    <p className="text-sm">
                      Encryption
                    </p>
                    <p className="text-xs text-gray-500">
                      Protected communication
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ADMIN CONTROLS */}
            {isAdmin && (
              <div className="px-5 py-5 border-b border-[#2a3942]">
                <h3 className="text-sm font-medium mb-3">
                  Admin controls
                </h3>

                <div className="space-y-3">
                  <div className="bg-[#202c33] rounded-xl p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">
                          Group information
                        </p>

                        <p className="text-sm text-gray-200 mt-1">
                          Edit the group name, photo and description.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          startEditGroupName();
                          startEditGroupDescription();
                        }}
                        className="shrink-0 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium"
                      >
                        Edit here
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#202c33] border border-[#2a3942] rounded-xl p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                          Project Workplace
                        </p>

                        <h3 className="text-sm font-medium">
                          {workplace
                            ? workplace.name
                            : "Create a shared workplace"}
                        </h3>

                        <p className="text-xs text-gray-500 mt-1 leading-5">
                          {workplace
                            ? "This group already has a connected project workspace."
                            : "Create one Workplace and automatically add current group members."}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          workplace
                            ? navigate(
                                `/project/${workplace._id}`
                              )
                            : (setWorkplaceName(
                                `${conversation?.name || "Group"} Workspace`
                              ),
                              setShowWorkplaceConfirm(
                                true
                              ))
                        }
                        disabled={creatingWorkplace}
                        className="shrink-0 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium"
                      >
                        {workplace
                          ? "Open Workplace"
                          : "Create"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* LEAVE GROUP */}
            <div className="px-5 py-6">
              <button
                type="button"
                onClick={handleLeaveGroup}
                disabled={
                  leavingGroup ||
                  isAdmin
                }
                className="w-full py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 disabled:opacity-50 text-sm font-medium transition"
              >
                {leavingGroup
                  ? "Leaving..."
                  : isAdmin
                  ? "Admin cannot leave group"
                  : "Leave Group"}
              </button>

              {isAdmin && (
                <p className="text-[11px] text-gray-600 text-center mt-2">
                  Admin transfer can be added later.
                </p>
              )}
            </div>
          </div>
        </aside>
      )}

      {/* =================================================== */}
      {/* WORKPLACE CONFIRMATION */}
      {/* =================================================== */}

      {showWorkplaceConfirm && (
        <div className="fixed inset-0 z-[120] bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#111b21] border border-[#2a3942] rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#2a3942]">
              <h2 className="font-semibold text-lg">
                Create Workplace
              </h2>

              <p className="text-sm text-gray-400 mt-1">
                Turn this group into a shared project workspace.
              </p>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-2">
                  Workplace name
                </label>

                <input
                  autoFocus
                  value={workplaceName}
                  onChange={(event) =>
                    setWorkplaceName(
                      event.target.value
                    )
                  }
                  maxLength={100}
                  placeholder="Enter Workplace name"
                  className="w-full bg-[#202c33] border border-[#33414a] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />

                <p className="text-[11px] text-gray-600 mt-2">
                  You can use any name for this project Workplace.
                </p>
              </div>

              <div className="bg-[#202c33] rounded-xl p-4">
                <p className="text-xs text-gray-500">
                  Group members
                </p>

                <p className="text-sm text-gray-200 mt-1">
                  {participants.length} member
                  {participants.length === 1 ? "" : "s"}
                </p>
              </div>

              <p className="text-xs text-gray-500 leading-5">
                The group admin creates the Workplace. Existing group
                members are added as project collaborators automatically.
              </p>
            </div>

            <div className="px-5 py-4 border-t border-[#2a3942] flex justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setShowWorkplaceConfirm(false)
                }
                disabled={creatingWorkplace}
                className="px-4 py-2.5 rounded-xl bg-[#202c33] hover:bg-[#2a3942] disabled:opacity-50 text-sm text-gray-200"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleCreateWorkplace}
                disabled={
                  creatingWorkplace ||
                  !workplaceName.trim()
                }
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-sm font-medium text-white"
              >
                {creatingWorkplace
                  ? "Creating..."
                  : "Create Workplace"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
