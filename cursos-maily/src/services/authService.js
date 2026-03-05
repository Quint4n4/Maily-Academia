import api, { setTokens } from './api';

export const authService = {
  async login(email, password) {
    const { data } = await api.post('/auth/login/', { email, password });
    setTokens(data.access, data.refresh);
    return data;
  },

  async register({
    email,
    firstName,
    lastName,
    phone,
    password,
    passwordConfirm,
    country,
    state,
    city,
    dateOfBirth,
  }) {
    const payload = {
      email,
      first_name: firstName,
      last_name: lastName,
      phone,
      password,
      password_confirm: passwordConfirm,
    };
    if (country) payload.country = country;
    if (state) payload.state = state;
    if (city) payload.city = city;
    if (dateOfBirth) payload.date_of_birth = dateOfBirth;

    const { data } = await api.post('/auth/register/', payload);
    return data;
  },

  async getMe() {
    const { data } = await api.get('/auth/me/');
    return data;
  },

  async updateProfile(updates) {
    const payload = {};
    if (updates.firstName !== undefined) payload.first_name = updates.firstName;
    if (updates.lastName !== undefined) payload.last_name = updates.lastName;
    if (updates.username !== undefined) payload.username = updates.username;
    if (updates.profile) {
      payload.profile = {};
      if (updates.profile.bio !== undefined) payload.profile.bio = updates.profile.bio;
      if (updates.profile.phone !== undefined) payload.profile.phone = updates.profile.phone;
      if (updates.profile.country !== undefined) payload.profile.country = updates.profile.country;
      if (updates.profile.state !== undefined) payload.profile.state = updates.profile.state;
      if (updates.profile.city !== undefined) payload.profile.city = updates.profile.city;
      if (updates.profile.dateOfBirth !== undefined) {
        payload.profile.date_of_birth = updates.profile.dateOfBirth;
      }
      if (updates.profile.occupationType !== undefined) {
        payload.profile.occupation_type = updates.profile.occupationType;
      }
    }
    const { data } = await api.patch('/auth/me/', payload);
    return data;
  },

  async getSurvey() {
    const { data } = await api.get('/auth/survey/');
    return data;
  },

  async saveSurvey(payload) {
    const { data } = await api.post('/auth/survey/', payload);
    return data;
  },

  async requestPasswordReset(email) {
    const { data } = await api.post('/auth/password-reset/request/', { email });
    return data;
  },

  async confirmPasswordReset(token, newPassword, confirmPassword) {
    const { data } = await api.post('/auth/password-reset/confirm/', {
      token,
      new_password: newPassword,
      confirm_password: confirmPassword,
    });
    return data;
  },
};

export default authService;
