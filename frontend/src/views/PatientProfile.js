const PatientProfile = {
    template: `
    <div class="container mt-4">
        <h2 class="mb-4"><i class="bi bi-person-circle text-primary"></i> My Profile</h2>

        <div class="row">
            <div class="col-md-8">
                <div class="card shadow mb-4">
                    <div class="card-header bg-primary text-white d-flex justify-content-between">
                        <h5 class="mb-0">Personal Information</h5>
                        <div>
                            <button v-if="!editing" @click="startEdit" class="btn btn-light btn-sm">
                                <i class="bi bi-pencil"></i> Edit Profile
                            </button>
                            <button v-else @click="cancelEdit" class="btn btn-secondary btn-sm">
                                <i class="bi bi-x"></i> Cancel
                            </button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div v-if="profileSuccess" class="alert alert-success">{{ profileSuccess }}</div>
                        <div v-if="profileError" class="alert alert-danger">{{ profileError }}</div>

                        <div class="mb-3">
                            <label class="form-label">Email (cannot be changed)</label>
                            <input type="email" class="form-control" :value="userEmail" disabled>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Full Name</label>
                            <input type="text" class="form-control" v-model="form.name" :disabled="!editing">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Phone</label>
                            <input type="text" class="form-control" v-model="form.phone" :disabled="!editing">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Blood Group</label>
                            <input type="text" class="form-control" v-model="form.blood_group" :disabled="!editing">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Address</label>
                            <textarea class="form-control" v-model="form.address" :disabled="!editing" rows="3"></textarea>
                        </div>

                        <div v-if="editing">
                            <button @click="saveProfile" class="btn btn-success" :disabled="saving">
                                <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-md-4">
                <div class="card shadow mb-4">
                    <div class="card-header bg-warning text-dark">
                        <h5 class="mb-0"><i class="bi bi-lock"></i> Change Password</h5>
                    </div>
                    <div class="card-body">
                        <div v-if="pwSuccess" class="alert alert-success">{{ pwSuccess }}</div>
                        <div v-if="pwError" class="alert alert-danger">{{ pwError }}</div>

                        <div class="mb-3">
                            <label class="form-label">Current Password</label>
                            <input type="password" class="form-control" v-model="pw.current">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">New Password</label>
                            <input type="password" class="form-control" v-model="pw.newPass">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Confirm New Password</label>
                            <input type="password" class="form-control" v-model="pw.confirm">
                        </div>
                        <button @click="changePassword" class="btn btn-warning w-100" :disabled="pwSaving">
                            <span v-if="pwSaving" class="spinner-border spinner-border-sm me-1"></span>
                            Update Password
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `,

    data() {
        return {
            profile: null,

            editing: false,

            saving: false,

            form: {
                name: '',
                phone: '',
                blood_group: '',
                address: ''
            },

            profileError: '',
            profileSuccess: '',

            pw: {
                current: '',
                newPass: '',
                confirm: ''
            },

            pwError: '',
            pwSuccess: '',

            pwSaving: false
        };
    },

    computed: {
        userEmail: function() {
            if (Store.state.user) {
                return Store.state.user.email;
            }
            return '';
        }
    },

    async mounted() {
        await this.fetchProfile();
    },

    methods: {
        async fetchProfile() {
            try {
                var res = await Store.apiCall('/api/patient/profile');
                if (res.ok) {
                    this.profile = await res.json();
                    this.form.name = this.profile.name;
                    this.form.phone = this.profile.phone;
                    this.form.blood_group = this.profile.blood_group;
                    this.form.address = this.profile.address;
                }
            } catch (e) {
                console.error('Failed to load profile:', e);
            }
        },

        startEdit() {
            this.profileError = '';
            this.profileSuccess = '';
            this.form.name = this.profile.name;
            this.form.phone = this.profile.phone;
            this.form.blood_group = this.profile.blood_group;
            this.form.address = this.profile.address;
            this.editing = true;
        },

        cancelEdit() {
            this.editing = false;
            this.profileError = '';
            this.form.name = this.profile.name;
            this.form.phone = this.profile.phone;
            this.form.blood_group = this.profile.blood_group;
            this.form.address = this.profile.address;
        },

        async saveProfile() {
            this.saving = true;
            this.profileError = '';
            this.profileSuccess = '';
            try {
                var res = await Store.apiCall('/api/patient/profile', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.form)
                });
                var d = await res.json();
                if (res.ok) {
                    this.profileSuccess = 'Profile updated successfully.';
                    this.profile.name = this.form.name;
                    this.profile.phone = this.form.phone;
                    this.profile.blood_group = this.form.blood_group;
                    this.profile.address = this.form.address;
                    this.editing = false;
                } else {
                    this.profileError = d.error || 'Failed to update profile.';
                }
            } catch (e) {
                this.profileError = 'Network error. Please try again.';
            }
            this.saving = false;
        },

        async changePassword() {
            this.pwError = '';
            this.pwSuccess = '';

            if (!this.pw.current || !this.pw.newPass || !this.pw.confirm) {
                this.pwError = 'All password fields are required.';
                return;
            }

            if (this.pw.newPass !== this.pw.confirm) {
                this.pwError = 'New password and confirmation do not match.';
                return;
            }

            this.pwSaving = true;
            try {
                var res = await Store.apiCall('/api/auth/change-password', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        current_password: this.pw.current,
                        new_password: this.pw.newPass
                    })
                });
                var d = await res.json();
                if (res.ok) {
                    this.pwSuccess = 'Password changed successfully.';
                    this.pw.current = '';
                    this.pw.newPass = '';
                    this.pw.confirm = '';
                } else {
                    this.pwError = d.error || 'Failed to change password.';
                }
            } catch (e) {
                this.pwError = 'Network error. Please try again.';
            }
            this.pwSaving = false;
        }
    }
};
