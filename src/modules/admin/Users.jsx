// src/modules/admin/Users.jsx
import React, { useState, useEffect, useMemo } from "react";
import { 
  Users as UsersIcon, 
  UserPlus, 
  ShieldCheck, 
  Search, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  AlertCircle,
  X,
  Lock,
  Mail,
  User,
  Phone,
  CalendarDays,
  Layers
} from "lucide-react";
import { getAllAdmins, saveAdminUser, toggleAdminStatus, deleteAdminUser } from "../../services/userService";
import { getAllEvents } from "../../services/eventService";
import { USER_ROLES } from "../../config/constants";
import { useAuth } from "../../context/AuthContext";
import { showSuccess, showError, showConfirm } from "../../utils/alert";

export default function Users() {
  const auth = useAuth() || {};
  const isSuperAdmin = auth.isSuperAdmin || false;
  const currentUser = auth.currentUser || null;

  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    role: USER_ROLES.VOLUNTEER || "volunteer",
    active: true,
    assignedEvents: []
  });

  // १. युजर्स आणि इव्हेंट्स डेटा लोड करणे
  const fetchData = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    else setRefreshing(true);

    try {
      const [allUsers, allEvents] = await Promise.all([
        getAllAdmins(),
        getAllEvents()
      ]);
      setUsers(allUsers || []);
      setEvents(allEvents || []);
    } catch (err) {
      console.error(err);
      showError("त्रुटी", "युजर्स किंवा इव्हेंट्स डेटा लोड करता आला नाही.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData(true);
  }, []);

  // २. स्टॅट्स कॅल्क्युलेशन (Summary Cards)
  const stats = useMemo(() => {
    let activeCount = 0;
    let superAdminCount = 0;

    users.forEach((u) => {
      if (u.active) activeCount++;
      if (u.role === (USER_ROLES.SUPERADMIN || "superadmin")) superAdminCount++;
    });

    return {
      total: users.length,
      active: activeCount,
      superAdmins: superAdminCount,
      others: users.length - superAdminCount
    };
  }, [users]);

  // ३. मोडल उघडणे (Add किंवा Edit साठी)
  const handleOpenModal = (userToEdit = null) => {
    if (userToEdit) {
      setIsEditing(true);
      setFormData({
        name: userToEdit.name || "",
        email: userToEdit.email || "",
        mobile: userToEdit.mobile || "",
        role: userToEdit.role || USER_ROLES.VOLUNTEER || "volunteer",
        active: userToEdit.active !== undefined ? userToEdit.active : true,
        assignedEvents: userToEdit.assignedEvents || []
      });
    } else {
      setIsEditing(false);
      setFormData({
        name: "",
        email: "",
        mobile: "",
        role: USER_ROLES.VOLUNTEER || "volunteer",
        active: true,
        assignedEvents: []
      });
    }
    setIsModalOpen(true);
  };

  // ४. इव्हेंट असाइनमेंट टॉगल
  const handleEventToggle = (eventId) => {
    setFormData((prev) => {
      const current = [...prev.assignedEvents];
      const exists = current.includes(eventId);
      return {
        ...prev,
        assignedEvents: exists
          ? current.filter((id) => id !== eventId)
          : [...current, eventId]
      };
    });
  };

  // ५. फॉर्म सबमिट (Save / Update)
  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!formData.email.trim()) {
      showError("माहिती अपूर्ण", "ईमेल टाकणे अनिवार्य आहे.");
      return;
    }

    setSaving(true);
    try {
      await saveAdminUser(formData.email, {
        name: formData.name.trim(),
        mobile: formData.mobile.trim(),
        role: formData.role,
        active: formData.active,
        assignedEvents: formData.role === (USER_ROLES.SUPERADMIN || "superadmin") ? [] : formData.assignedEvents
      });

      showSuccess("यशस्वी", `युजर माहिती यशस्वीरीत्या ${isEditing ? "अपडेट" : "जतन"} झाली.`);
      setIsModalOpen(false);
      fetchData(false);
    } catch (err) {
      console.error(err);
      showError("त्रुटी", "युजर सेव्ह करताना अडचण आली.");
    } finally {
      setSaving(false);
    }
  };

  // ६. स्टेटस टॉगल (Active / Inactive)
  const handleToggleStatus = async (user) => {
    if (user.email === currentUser?.email) {
      showError("अस्वीकृत", "तुम्ही स्वतःचे स्टेटस बदलू शकत नाही.");
      return;
    }

    try {
      await toggleAdminStatus(user.email, user.active);
      setUsers((prev) =>
        prev.map((u) => (u.email === user.email ? { ...u, active: !u.active } : u))
      );
      showSuccess("अपडेट", `${user.name || user.email} ची स्थिती बदलली.`);
    } catch (err) {
      console.error(err);
      showError("त्रुटी", "स्थिती अपडेट करता आली नाही.");
    }
  };

  // ७. युजर डिलीट करणे
  const handleDeleteUser = async (user) => {
    if (user.email === currentUser?.email) {
      showError("अस्वीकृत", "तुम्ही स्वतःचे खाते डिलीट करू शकत नाही.");
      return;
    }

    const confirmed = await showConfirm(
      "खात्री करा",
      `तुम्हाला नक्की '${user.name || user.email}' या युजरचे अधिकार काढून टाकायचे आहेत का?`
    );

    if (confirmed) {
      try {
        await deleteAdminUser(user.email);
        setUsers((prev) => prev.filter((u) => u.email !== user.email));
        showSuccess("यशस्वी", "युजर काढून टाकण्यात आला.");
      } catch (err) {
        console.error(err);
        showError("त्रुटी", "युजर डिलीट करताना अडचण आली.");
      }
    }
  };

  // ८. सर्च आणि फिल्टर
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    const name = String(u.name || "").toLowerCase();
    const email = String(u.email || "").toLowerCase();
    const mobile = String(u.mobile || "");

    const matchQuery = !q || name.includes(q) || email.includes(q) || mobile.includes(q);
    const matchRole = roleFilter === "all" || u.role === roleFilter;

    return matchQuery && matchRole;
  });

  return (
    <div className="w-full space-y-4 font-sans pb-12">
      
      {/* 1. Header Box */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200/90 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              युजर्स आणि परवानग्या (RBAC)
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              अधिकार नियंत्रण, रोल्स आणि इव्हेंट असाइनमेंट
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => fetchData(false)}
            disabled={loading || refreshing}
            className="p-2 sm:px-3 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
            title="रिफ्रेश करा"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-orange-600" : ""}`} />
            <span className="hidden sm:inline">रिफ्रेश</span>
          </button>

          {isSuperAdmin && (
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black shadow-sm transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>नवीन युजर जोडा</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Summary Stats Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-white p-3 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">एकूण युजर्स</span>
            <UsersIcon className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-slate-500" />
          </div>
          <div className="mt-1 sm:mt-2">
            <div className="text-lg sm:text-3xl font-black text-slate-900 leading-none">{stats.total}</div>
            <div className="text-[10px] sm:text-xs font-semibold text-slate-400 mt-1">सिस्टम ॲडमिन्स</div>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">सक्रिय युजर्स</span>
            <CheckCircle2 className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-emerald-600" />
          </div>
          <div className="mt-1 sm:mt-2">
            <div className="text-lg sm:text-3xl font-black text-emerald-600 leading-none">{stats.active}</div>
            <div className="text-[10px] sm:text-xs font-semibold text-slate-400 mt-1">Active Accounts</div>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">सुपरॲडमिन</span>
            <ShieldCheck className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-orange-600" />
          </div>
          <div className="mt-1 sm:mt-2">
            <div className="text-lg sm:text-3xl font-black text-orange-600 leading-none">{stats.superAdmins}</div>
            <div className="text-[10px] sm:text-xs font-semibold text-slate-400 mt-1">पूर्ण अधिकार</div>
          </div>
        </div>
      </div>

      {/* 3. Search and Role Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="flex-1 bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400 ml-1 shrink-0" />
          <input
            type="text"
            placeholder="नाव, ईमेल किंवा मोबाईल शोधा..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs sm:text-sm font-medium focus:outline-none text-slate-800 placeholder-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="px-2 text-xs font-bold text-slate-400 hover:text-slate-600 shrink-0"
            >
              साफ करा
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto no-scrollbar">
          {["all", USER_ROLES.SUPERADMIN || "superadmin", USER_ROLES.FINANCE_ADMIN || "finance_admin", USER_ROLES.DESK_ADMIN || "desk_admin", USER_ROLES.VOLUNTEER || "volunteer"].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap capitalize ${
                roleFilter === r
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {r === "all" ? "सर्व" : r.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Users List */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs sm:text-sm bg-white rounded-3xl border border-slate-200">
            <div className="w-6 h-6 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            युजर्स यादी लोड होत आहे...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-14 text-center text-slate-400 text-xs sm:text-sm px-4 bg-white rounded-3xl border border-slate-200">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            कोणताही युजर सापडला नाही.
          </div>
        ) : (
          filteredUsers.map((u, index) => {
            const isSelf = u.email === currentUser?.email;
            const isSuper = u.role === (USER_ROLES.SUPERADMIN || "superadmin");

            return (
              <div
                key={u.id || u.email}
                className="bg-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-sm flex items-center justify-between gap-3 hover:border-orange-200 transition"
              >
                {/* Left Side: Avatar, Name, Email, Role, Assigned Events */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-xs sm:text-sm shrink-0 border ${
                    isSuper 
                      ? "bg-orange-50 text-orange-600 border-orange-100" 
                      : "bg-slate-100 text-slate-700 border-slate-200"
                  }`}>
                    {u.name ? u.name.charAt(0).toUpperCase() : u.email.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                        {u.name || "अनामिक युजर"}
                      </h3>
                      {isSelf && (
                        <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.2 rounded">
                          तुम्ही स्वतः
                        </span>
                      )}
                      <span className={`text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                        isSuper
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : u.role === (USER_ROLES.FINANCE_ADMIN || "finance_admin")
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}>
                        {u.role ? u.role.replace("_", " ") : "Volunteer"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 truncate flex-wrap">
                      <span className="font-medium text-slate-700">{u.email}</span>
                      {u.mobile && <span className="text-slate-400">• {u.mobile}</span>}
                    </div>

                    {/* Assigned Events Badge */}
                    {!isSuper && (
                      <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                        <span className="text-[10px] font-bold text-slate-400">इव्हेंट्स:</span>
                        {u.assignedEvents && u.assignedEvents.length > 0 ? (
                          u.assignedEvents.map((evId) => {
                            const evObj = events.find((e) => e.id === evId);
                            return (
                              <span
                                key={evId}
                                className="text-[9px] font-bold bg-slate-50 text-slate-600 border border-slate-200 px-1.5 py-0.2 rounded"
                              >
                                {evObj?.title || evId}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-[10px] text-amber-600 font-bold">कोणताही इव्हेंट दिलेला नाही</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side: Status Toggle, Edit, Delete */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  {/* Status Toggle Button */}
                  <button
                    disabled={!isSuperAdmin || isSelf}
                    onClick={() => handleToggleStatus(u)}
                    className={`px-2.5 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold transition flex items-center gap-1 border cursor-pointer ${
                      u.active
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                        : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                    }`}
                    title={isSelf ? "स्वतःचे स्टेटस बदलता येत नाही" : "स्टेटस बदला"}
                  >
                    {u.active ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Active</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3 text-slate-400" />
                        <span>Inactive</span>
                      </>
                    )}
                  </button>

                  {/* Edit Button */}
                  {isSuperAdmin && (
                    <button
                      onClick={() => handleOpenModal(u)}
                      className="p-1.5 sm:p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                      title="माहिती बदला"
                    >
                      <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  )}

                  {/* Delete Button */}
                  {isSuperAdmin && !isSelf && (
                    <button
                      onClick={() => handleDeleteUser(u)}
                      className="p-1.5 sm:p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition cursor-pointer"
                      title="काढून टाका"
                    >
                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. Add / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-orange-600" />
                <h3 className="text-base font-black text-slate-900">
                  {isEditing ? "युजर माहिती संपादित करा" : "नवीन ॲडमिन / व्हॉलंटियर जोडा"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveUser} className="p-4 sm:p-5 space-y-4 overflow-y-auto">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">पूर्ण नाव</label>
                <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 focus-within:bg-white focus-within:border-orange-500">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    required
                    placeholder="उदा. अमित कदम"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ईमेल (लॉगिनसाठी)</label>
                <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 focus-within:bg-white focus-within:border-orange-500">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="email"
                    required
                    disabled={isEditing}
                    placeholder="admin@jbsc.org"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full text-xs font-semibold focus:outline-none ${isEditing ? "text-slate-400 cursor-not-allowed" : ""}`}
                  />
                </div>
                {isEditing && <span className="text-[10px] text-slate-400 mt-0.5 block">ईमेल बदलता येत नाही.</span>}
              </div>

              {/* Mobile */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">मोबाईल नंबर (ऐच्छिक)</label>
                <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 focus-within:bg-white focus-within:border-orange-500">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="tel"
                    placeholder="98XXXXXXXX"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">सिस्टम रोल (Role)</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 focus:bg-white focus:outline-none focus:border-orange-500"
                >
                  <option value={USER_ROLES.VOLUNTEER || "volunteer"}>Volunteer (फक्त नाव पाहणे व हजेरी)</option>
                  <option value={USER_ROLES.DESK_ADMIN || "desk_admin"}>Desk Admin (नोंदणी पडताळणी व Paid मार्क)</option>
                  <option value={USER_ROLES.FINANCE_ADMIN || "finance_admin"}>Finance Admin (पेमेंट आणि जमा-खर्च)</option>
                  <option value={USER_ROLES.SUPERADMIN || "superadmin"}>Superadmin (सर्व अधिकार)</option>
                </select>
              </div>

              {/* Event Assignments (Hidden if Superadmin) */}
              {formData.role !== (USER_ROLES.SUPERADMIN || "superadmin") && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>अधिकार असलेले इव्हेंट्स (Assigned Events)</span>
                    <span className="text-[10px] text-slate-400 font-normal">किमान १ इव्हेंट निवडा</span>
                  </label>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto border border-slate-200 rounded-2xl p-2.5 bg-slate-50/50">
                    {events.map((ev) => {
                      const isChecked = formData.assignedEvents.includes(ev.id);
                      return (
                        <label
                          key={ev.id}
                          className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white transition cursor-pointer text-xs font-bold text-slate-700"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleEventToggle(ev.id)}
                            className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                          />
                          <span>{ev.title}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Account Status Switch */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <div className="text-xs font-bold text-slate-800">अकाउंट स्थिती</div>
                  <div className="text-[10px] text-slate-500">युजरला सिस्टीममध्ये प्रवेश देण्याची अनुमती</div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, active: !formData.active })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                    formData.active
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-slate-200 text-slate-600 border-slate-300"
                  }`}
                >
                  {formData.active ? "Active" : "Inactive"}
                </button>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  रद्द करा
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-xs font-black bg-orange-600 hover:bg-orange-700 text-white shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  {saving ? "जतन होत आहे..." : isEditing ? "अपडेट करा" : "जोडा"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}