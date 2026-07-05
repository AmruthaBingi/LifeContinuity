import React, { useState, useEffect } from "react";
import { 
  User, Shield, Phone, Heart, Users, Key, CheckCircle2, 
  Plus, Trash2, ShieldCheck, Activity, FileCheck, ClipboardList 
} from "lucide-react";
import { EmergencyProfile, MedicalProfile, TrustedContact } from "../types";
import { supabase, logAuditAction } from "../lib/supabaseClient";

interface ProfileFormProps {
  initialProfile: EmergencyProfile;
  onSave: (profile: EmergencyProfile) => void;
  showToast: (message: string, type: "success" | "info" | "warning") => void;
}

export default function ProfileForm({ initialProfile, onSave, showToast }: ProfileFormProps) {
  const [profile, setProfile] = useState<EmergencyProfile>({ ...initialProfile });
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Medical Profile CRUD State
  const [medical, setMedical] = useState<MedicalProfile>({
    conditions: "",
    allergies: "",
    medications: "",
    bloodGroup: initialProfile.bloodGroup || "O+ Pos",
    insuranceProvider: "",
    policyNumber: "",
  });

  // Trusted Contacts CRUD State
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [contactForm, setContactForm] = useState({
    name: "",
    phone: "",
    email: "",
    relation: "",
    accessGranted: false,
  });
  const [addingContact, setAddingContact] = useState(false);

  // Load user profile, medical profile, and trusted contacts from Supabase
  useEffect(() => {
    async function loadData() {
      if (!supabase) return;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);

          // 1. Fetch Profile
          const { data: profileData, error: profileErr } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();

          if (profileData) {
            const loadedProfile = {
              name: profileData.name || user.user_metadata?.full_name || "",
              age: Number(profileData.age) || 0,
              bloodGroup: profileData.blood_group || profileData.bloodGroup || "O+ Pos",
              emergencyContactName: profileData.emergency_contact_name || profileData.emergencyContactName || "",
              emergencyContactPhone: profileData.emergency_contact_phone || profileData.emergencyContactPhone || "",
              nomineeName: profileData.nominee_name || profileData.nomineeName || "",
              nomineePhone: profileData.nominee_phone || profileData.nomineePhone || "",
              nomineePin: profileData.nominee_pin || profileData.nomineePin || "",
            };
            setProfile(loadedProfile);
            onSave(loadedProfile);
          }

          // 2. Fetch Medical Profile
          const { data: medicalData, error: medicalErr } = await supabase
            .from("medical_profiles")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

          if (medicalData) {
            setMedical({
              conditions: medicalData.conditions || "",
              allergies: medicalData.allergies || "",
              medications: medicalData.medications || "",
              bloodGroup: medicalData.blood_group || medicalData.bloodGroup || profileData?.blood_group || "O+ Pos",
              insuranceProvider: medicalData.insurance_provider || medicalData.insuranceProvider || "",
              policyNumber: medicalData.policy_number || medicalData.policyNumber || "",
            });
          }

          // 3. Fetch Trusted Contacts
          const { data: contactsData, error: contactsErr } = await supabase
            .from("trusted_contacts")
            .select("*")
            .eq("user_id", user.id);

          if (contactsData) {
            setContacts(
              contactsData.map((tc: any) => ({
                id: tc.id,
                userId: tc.user_id,
                name: tc.name,
                phone: tc.phone,
                email: tc.email,
                relation: tc.relation,
                accessGranted: tc.access_granted !== undefined ? tc.access_granted : tc.accessGranted || false,
              }))
            );
          }
        }
      } catch (err) {
        console.error("Error loading profile details from Supabase:", err);
      }
    }
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (supabase && userId) {
        // Save profile to database
        const { error: profileErr } = await supabase
          .from("profiles")
          .upsert({
            id: userId,
            name: profile.name,
            age: profile.age,
            blood_group: profile.bloodGroup,
            emergency_contact_name: profile.emergencyContactName,
            emergency_contact_phone: profile.emergencyContactPhone,
            nominee_name: profile.nomineeName,
            nominee_phone: profile.nomineePhone,
            nominee_pin: profile.nomineePin,
            updated_at: new Date().toISOString(),
          });

        if (profileErr) throw profileErr;

        // Save medical profile to database
        const { error: medicalErr } = await supabase
          .from("medical_profiles")
          .upsert({
            user_id: userId,
            conditions: medical.conditions,
            allergies: medical.allergies,
            medications: medical.medications,
            blood_group: profile.bloodGroup,
            insurance_provider: medical.insuranceProvider,
            policy_number: medical.policyNumber,
            updated_at: new Date().toISOString(),
          });

        if (medicalErr) throw medicalErr;

        // Write Audit Log
        await logAuditAction(
          userId,
          profile.name || "User",
          "User",
          "UPDATE_PROFILE",
          "Updated core emergency and medical profiles in database"
        );

        onSave(profile);
        showToast("Emergency & Medical Profiles synced successfully with Supabase!", "success");
      } else {
        // Fallback for non-connected mode
        onSave(profile);
        showToast("Profile saved locally.", "success");
      }
    } catch (err: any) {
      console.error("Save error:", err);
      showToast(err.message || "Failed to save profile to backend.", "warning");
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof EmergencyProfile, value: any) => {
    setProfile((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Add Trusted Contact to Supabase
  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.phone) {
      showToast("Please enter a name and phone number.", "warning");
      return;
    }

    setAddingContact(true);
    try {
      if (supabase && userId) {
        const { data, error } = await supabase
          .from("trusted_contacts")
          .insert({
            user_id: userId,
            name: contactForm.name,
            phone: contactForm.phone,
            email: contactForm.email,
            relation: contactForm.relation,
            access_granted: contactForm.accessGranted,
          })
          .select()
          .single();

        if (error) throw error;

        const inserted: TrustedContact = {
          id: data.id,
          userId: data.user_id,
          name: data.name,
          phone: data.phone,
          email: data.email,
          relation: data.relation,
          accessGranted: data.access_granted,
        };

        setContacts((prev) => [...prev, inserted]);
        
        await logAuditAction(
          userId,
          profile.name || "User",
          "User",
          "ADD_TRUSTED_CONTACT",
          `Added trusted contact: ${contactForm.name} (${contactForm.relation})`
        );

        showToast(`Added ${contactForm.name} to trusted contacts!`, "success");
        setContactForm({
          name: "",
          phone: "",
          email: "",
          relation: "",
          accessGranted: false,
        });
      } else {
        // Mock fallback
        const mockContact: TrustedContact = {
          id: String(Date.now()),
          name: contactForm.name,
          phone: contactForm.phone,
          email: contactForm.email,
          relation: contactForm.relation,
          accessGranted: contactForm.accessGranted,
        };
        setContacts((prev) => [...prev, mockContact]);
        showToast("Trusted contact added locally.", "success");
      }
    } catch (err: any) {
      console.error("Add contact error:", err);
      showToast(err.message || "Failed to add trusted contact.", "warning");
    } finally {
      setAddingContact(false);
    }
  };

  // Toggle Trusted Contact Access
  const handleToggleAccess = async (id: string, currentVal: boolean) => {
    try {
      const newVal = !currentVal;
      if (supabase && userId) {
        const { error } = await supabase
          .from("trusted_contacts")
          .update({ access_granted: newVal })
          .eq("id", id);

        if (error) throw error;

        setContacts((prev) =>
          prev.map((c) => (c.id === id ? { ...c, accessGranted: newVal } : c))
        );

        const contactName = contacts.find(c => c.id === id)?.name || "Contact";
        await logAuditAction(
          userId,
          profile.name || "User",
          "User",
          "TOGGLE_CONTACT_ACCESS",
          `Changed Nominee Access for ${contactName} to ${newVal ? "GRANTED" : "REVOKED"}`
        );

        showToast(`Access updated for ${contactName}!`, "success");
      } else {
        setContacts((prev) =>
          prev.map((c) => (c.id === id ? { ...c, accessGranted: newVal } : c))
        );
      }
    } catch (err: any) {
      console.error("Toggle access error:", err);
      showToast(err.message || "Failed to update access.", "warning");
    }
  };

  // Delete Trusted Contact from Supabase
  const handleDeleteContact = async (id: string, name: string) => {
    try {
      if (supabase && userId) {
        const { error } = await supabase
          .from("trusted_contacts")
          .delete()
          .eq("id", id);

        if (error) throw error;

        setContacts((prev) => prev.filter((c) => c.id !== id));

        await logAuditAction(
          userId,
          profile.name || "User",
          "User",
          "DELETE_TRUSTED_CONTACT",
          `Removed trusted contact: ${name}`
        );

        showToast(`Removed ${name} from trusted contacts.`, "info");
      } else {
        setContacts((prev) => prev.filter((c) => c.id !== id));
        showToast("Contact removed locally.", "info");
      }
    } catch (err: any) {
      console.error("Delete contact error:", err);
      showToast(err.message || "Failed to remove trusted contact.", "warning");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
              <Heart className="w-5 h-5 text-blue-500 fill-blue-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Emergency & Nominee Profile</h2>
              <p className="text-xs text-slate-500">
                Crucial life-saving data and access parameters for emergency responders and nominees.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Core Personal Vital Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <User className="w-3.5 h-3.5 animate-pulse text-blue-500" /> Vital Personal Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={profile.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Name as in Aadhaar / Passport"
                  className="w-full px-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Age (Years)</label>
                <input
                  type="number"
                  required
                  value={profile.age || ""}
                  onChange={(e) => handleInputChange("age", parseInt(e.target.value) || 0)}
                  placeholder="e.g. 64"
                  className="w-full px-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Blood Group</label>
                <select
                  value={profile.bloodGroup}
                  onChange={(e) => handleInputChange("bloodGroup", e.target.value)}
                  className="w-full px-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all animate-none"
                >
                  <option value="O+ Pos">O+ (Positive)</option>
                  <option value="O- Neg">O- (Negative)</option>
                  <option value="A+ Pos">A+ (Positive)</option>
                  <option value="A- Neg">A- (Negative)</option>
                  <option value="B+ Pos">B+ (Positive)</option>
                  <option value="B- Neg">B- (Negative)</option>
                  <option value="AB+ Pos">AB+ (Positive)</option>
                  <option value="AB- Neg">AB- (Negative)</option>
                </select>
              </div>
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Medical Profile Section (CRUD live mapping) */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-rose-500" /> Medical & Health Profile (Medical CRUD)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Chronic Illnesses & Medical Conditions</label>
                <textarea
                  value={medical.conditions}
                  onChange={(e) => setMedical(prev => ({ ...prev, conditions: e.target.value }))}
                  placeholder="e.g. Type-2 Diabetes, Hypertension, Cardiac Stent placed in 2024"
                  className="w-full px-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all h-20 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Known Allergies & Drug Reactions</label>
                <textarea
                  value={medical.allergies}
                  onChange={(e) => setMedical(prev => ({ ...prev, allergies: e.target.value }))}
                  placeholder="e.g. Penicillin, Sulfa drugs, Peanuts, Lactose intolerant"
                  className="w-full px-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all h-20 resize-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Active Medications & Dosage Schedules</label>
                <input
                  type="text"
                  value={medical.medications}
                  onChange={(e) => setMedical(prev => ({ ...prev, medications: e.target.value }))}
                  placeholder="e.g. Metformin 500mg (2x daily), Atorvastatin 10mg (nightly)"
                  className="w-full px-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Primary Insurance Provider</label>
                <input
                  type="text"
                  value={medical.insuranceProvider}
                  onChange={(e) => setMedical(prev => ({ ...prev, insuranceProvider: e.target.value }))}
                  placeholder="e.g. Star Health / HDFC Ergo"
                  className="w-full px-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Health Insurance Policy Number</label>
                <input
                  type="text"
                  value={medical.policyNumber}
                  onChange={(e) => setMedical(prev => ({ ...prev, policyNumber: e.target.value }))}
                  placeholder="e.g. POL-8821-B9"
                  className="w-full px-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Immediate Responders Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-emerald-500" /> Immediate Emergency Responders
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Primary Emergency Contact Name</label>
                <input
                  type="text"
                  required
                  value={profile.emergencyContactName}
                  onChange={(e) => handleInputChange("emergencyContactName", e.target.value)}
                  placeholder="Full Name"
                  className="w-full px-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Primary Contact Phone Number</label>
                <input
                  type="text"
                  required
                  value={profile.emergencyContactPhone}
                  onChange={(e) => handleInputChange("emergencyContactPhone", e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Legally Authorized Nominee Parameters */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-indigo-500" /> Primary Nominee Credentials
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed bg-blue-50/50 p-3.5 rounded-xl border border-blue-100/50">
              <strong>Nominee Rule:</strong> This individual is your primary legal nominee. They will have authorized permission to log in and access your continuity plan and essential records during crisis mode using their phone number and your Emergency PIN.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nominee Full Name</label>
                <input
                  type="text"
                  required
                  value={profile.nomineeName}
                  onChange={(e) => handleInputChange("nomineeName", e.target.value)}
                  placeholder="Nominee Legal Name"
                  className="w-full px-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nominee Registered Phone Number</label>
                <input
                  type="text"
                  required
                  value={profile.nomineePhone}
                  onChange={(e) => handleInputChange("nomineePhone", e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                  <Key className="w-3 h-3 text-blue-600" /> Emergency Access PIN
                </label>
                <input
                  type="text"
                  required
                  maxLength={4}
                  value={profile.nomineePin}
                  onChange={(e) => handleInputChange("nomineePin", e.target.value.replace(/\D/g, ""))}
                  placeholder="4-digit PIN (e.g. 8829)"
                  className="w-full px-4 py-2 text-sm font-mono tracking-widest rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-850 text-white font-semibold rounded-xl text-sm transition-all shadow-sm active:scale-[0.98] flex items-center gap-2 disabled:opacity-75 cursor-pointer"
            >
              {saving ? (
                <>
                  <span className="border-2 border-white border-t-transparent w-4 h-4 rounded-full animate-spin"></span>
                  Saving Profiles...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                  Save Profiles
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Trusted Contacts CRUD Directory Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" /> Trusted Emergency Contacts (Trusted Contacts CRUD)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Build your circle of trusted medical responders, family members, or legal guardians. Give them permission to view specific documents or contact medical desks.
          </p>
        </div>

        {/* Existing Contacts Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="p-3.5">Name</th>
                <th className="p-3.5">Relation</th>
                <th className="p-3.5">Phone / Email</th>
                <th className="p-3.5 text-center">Nominee Access</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {contacts.length > 0 ? (
                contacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-white transition-colors">
                    <td className="p-3.5 font-bold text-slate-800">{contact.name}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 font-semibold text-[10px] bg-slate-200 text-slate-700 rounded-md border border-slate-300">
                        {contact.relation || "Family"}
                      </span>
                    </td>
                    <td className="p-3.5 font-medium text-slate-500 space-y-0.5">
                      <span className="block font-mono text-slate-700">{contact.phone}</span>
                      {contact.email && <span className="block text-[10px]">{contact.email}</span>}
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleAccess(contact.id!, contact.accessGranted)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer border transition-all ${
                          contact.accessGranted
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {contact.accessGranted ? "✓ Access Granted" : "✕ Access Revoked"}
                      </button>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteContact(contact.id!, contact.name)}
                        className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 cursor-pointer border border-transparent hover:border-rose-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                    No additional trusted contacts registered. Add your first below!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Add Contact Mini Form */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-emerald-600" /> Register New Trusted Contact
          </h4>

          <form onSubmit={handleAddContact} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5 items-end">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={contactForm.name}
                onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Dr. Ramesh Gupta"
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Relationship</label>
              <input
                type="text"
                value={contactForm.relation}
                onChange={(e) => setContactForm(prev => ({ ...prev, relation: e.target.value }))}
                placeholder="e.g. Family Physician"
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Phone Number</label>
              <input
                type="text"
                required
                value={contactForm.phone}
                onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+91 99000-00001"
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Email Address</label>
              <input
                type="email"
                value={contactForm.email}
                onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="doctor@apollo.com"
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={addingContact}
                className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-1 cursor-pointer h-[34px]"
              >
                {addingContact ? "Adding..." : "Add Contact"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
