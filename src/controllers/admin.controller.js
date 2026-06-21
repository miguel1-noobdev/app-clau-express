const AdminService = require('../services/admin.service');

async function getUsers(req, res) {
  const result = await AdminService.listUsers(req.session.userId);
  res.json(result);
}

async function createUser(req, res) {
  const result = await AdminService.createUser(req.body, req.session.username);
  if (result.error) return res.status(400).json({ error: result.error });
  res.status(201).json({ success: true, user: result.user });
}

async function updateUser(req, res) {
  const result = await AdminService.updateUser(req.params.id, req.body, req.session.username);
  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result.user);
}

async function deleteUser(req, res) {
  const result = await AdminService.deleteUser(req.params.id);
  if (result.error) return res.status(400).json({ error: result.error });
  res.json({ success: true, message: 'Usuario eliminado correctamente' });
}

async function toggleUserStatus(req, res) {
  const result = await AdminService.toggleUserStatus(req.params.id);
  if (result.error) return res.status(404).json({ error: result.error });
  res.json(result);
}

async function changeUserRole(req, res) {
  const { role } = req.body;
  const result = await AdminService.changeUserRole(req.params.id, role, req.session.username);
  if (result.error) return res.status(403).json({ error: result.error });
  res.json(result);
}

async function resetPassword(req, res) {
  const result = await AdminService.resetUserPassword(req.params.id);
  if (result.error) return res.status(404).json({ error: result.error });
  res.json(result);
}

async function getUserRecords(req, res) {
  const result = await AdminService.getUserRecords(req.params.id);
  if (result.error) return res.status(404).json({ error: result.error });
  res.json(result);
}

async function editRecord(req, res) {
  const result = await AdminService.editRecord(req.params.id, req.body, req.session.username);
  if (result.error) return res.status(404).json({ error: result.error });
  res.json({ success: true, record: result.record, logId: result.logId });
}

async function deleteRecord(req, res) {
  const result = await AdminService.deleteRecord(req.params.id, req.body?.reason || '', req.session.username);
  if (result.error) return res.status(404).json({ error: result.error });
  res.json({ success: true, message: 'Registro eliminado correctamente', logId: result.logId });
}

async function getAccessLogs(req, res) {
  const result = await AdminService.getAccessLogs(req.query);
  res.json(result);
}

async function getModificationLogs(req, res) {
  const result = await AdminService.getModificationLogs(req.query);
  res.json(result);
}

module.exports = {
  getUsers, createUser, updateUser, deleteUser,
  toggleUserStatus, changeUserRole, resetPassword, getUserRecords,
  editRecord, deleteRecord, getAccessLogs, getModificationLogs,
};
