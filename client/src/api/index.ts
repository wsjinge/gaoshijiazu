import axios from 'axios';
import type { Member, Generation, Statistics } from '../types';

const api = axios.create({ baseURL: '/api' });

export const getMembers = () => api.get<Member[]>('/members').then(r => r.data);
export const getMember = (id: number) => api.get<Member>(`/members/${id}`).then(r => r.data);
export const createMember = (data: Partial<Member>) => api.post<Member>('/members', data).then(r => r.data);
export const updateMember = (id: number, data: Partial<Member>) => api.put<Member>(`/members/${id}`, data).then(r => r.data);
export const deleteMember = (id: number) => api.delete(`/members/${id}`).then(r => r.data);
export const getMemberChildren = (id: number) => api.get<Member[]>(`/members/${id}/children`).then(r => r.data);
export const getTreeData = () => api.get<Member[]>('/members/tree/all').then(r => r.data);
export const getGenerations = () => api.get<Generation[]>('/generations').then(r => r.data);
export const getStatistics = () => api.get<Statistics>('/statistics').then(r => r.data);
export const uploadAvatar = (file: File) => {
  const fd = new FormData();
  fd.append('avatar', file);
  return api.post<{ url: string }>('/upload-avatar', fd).then(r => r.data);
};
