const AdminService = require('../src/services/admin.service');

// Mock models
jest.mock('../src/models', () => ({
  User: Object.assign(jest.fn(), {
    find: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    deleteMany: jest.fn(),
  }),
  Record: {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
  AccessLog: {
    find: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
  },
  ModificationLog: {
    find: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
  },
  Message: {},
}));

const { User, Record, AccessLog, ModificationLog } = require('../src/models');

// Helper to build a mock query chain that resolves to a value
function mockQuery(resolvedValue) {
  const chain = {
    populate: () => chain,
    select: () => chain,
    sort: () => chain,
    limit: () => chain,
    skip: () => chain,
    then: (resolve) => resolve(resolvedValue),
  };
  Object.setPrototypeOf(chain, Promise.prototype);
  return chain;
}

describe('AdminService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listUsers', () => {
    test('returns users without password field', async () => {
      const mockUsers = [
        { _id: '1', username: 'admin', role: 'admin' },
        { _id: '2', username: 'user1', role: 'user' },
      ];
      User.find.mockReturnValue(mockQuery(mockUsers));

      const result = await AdminService.listUsers();

      expect(result.success).toBe(true);
      expect(result.users).toEqual(mockUsers);
    });

    test('returns error on database failure', async () => {
      User.find.mockImplementation(() => {
        throw new Error('DB error');
      });

      const result = await AdminService.listUsers();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Error al obtener usuarios');
    });
  });

  describe('createUser', () => {
    test('creates a user with mustChangePassword=true', async () => {
      User.findOne.mockResolvedValue(null);
      const saveMock = jest.fn().mockResolvedValue(undefined);
      const mockUserInstance = {
        _id: 'u1',
        username: 'newuser',
        role: 'user',
        phone: '',
        email: '',
        mustChangePassword: true,
        save: saveMock,
      };
      User.mockImplementation(() => mockUserInstance);

      const result = await AdminService.createUser(
        { username: 'newuser', password: 'Pass1234', role: 'user', phone: '', email: '' },
        'admin'
      );

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user.username).toBe('newuser');
      expect(result.user.mustChangePassword).toBe(true);
    });

    test('rejects when username already exists', async () => {
      User.findOne.mockResolvedValue({ username: 'existing' });

      const result = await AdminService.createUser(
        { username: 'existing', password: 'Pass1234', role: 'user' },
        'admin'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('El usuario ya existe');
    });

    test('rejects non-admin creating admin/supervisor', async () => {
      const result = await AdminService.createUser(
        { username: 'newadmin', password: 'Pass1234', role: 'admin' },
        'supervisor'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Solo el administrador principal');
    });
  });

  describe('updateUser', () => {
    test('updates user and returns updated user without password', async () => {
      const mockUser = { _id: '1', username: 'user1', password: 'oldpass', save: jest.fn() };
      User.findById.mockResolvedValue(mockUser);
      User.findByIdAndUpdate.mockReturnValue(
        mockQuery({ _id: '1', username: 'user1updated', role: 'user' })
      );

      const result = await AdminService.updateUser(
        '1',
        { username: 'user1updated', role: 'user' },
        'admin'
      );

      expect(result.success).toBe(true);
      expect(result.user.username).toBe('user1updated');
    });
  });

  describe('deleteUser', () => {
    test('deletes user successfully', async () => {
      User.findById.mockResolvedValue({ _id: '2', username: 'user2' });
      User.findByIdAndDelete.mockResolvedValue({});

      const result = await AdminService.deleteUser('2');

      expect(result.success).toBe(true);
    });

    test('prevents deleting main admin account', async () => {
      User.findById.mockResolvedValue({ _id: '1', username: 'admin' });

      const result = await AdminService.deleteUser('1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('administrador principal');
    });
  });

  describe('toggleUserStatus', () => {
    test('toggles user active status', async () => {
      const saveMock = jest.fn().mockResolvedValue(undefined);
      const mockUser = { _id: '2', username: 'user2', isActive: true, save: saveMock };
      User.findById.mockResolvedValue(mockUser);

      const result = await AdminService.toggleUserStatus('2');

      expect(mockUser.isActive).toBe(false);
      expect(result.success).toBe(true);
      expect(result.user.isActive).toBe(false);
    });

    test('returns error when user not found', async () => {
      User.findById.mockResolvedValue(null);

      const result = await AdminService.toggleUserStatus('999');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Usuario no encontrado');
    });
  });

  describe('changeUserRole', () => {
    test('changes role successfully', async () => {
      const saveMock = jest.fn().mockResolvedValue(undefined);
      const mockUser = { _id: '2', username: 'user2', role: 'user', save: saveMock };
      User.findById.mockResolvedValue(mockUser);

      const result = await AdminService.changeUserRole('2', 'supervisor', 'admin');

      expect(mockUser.role).toBe('supervisor');
      expect(result.success).toBe(true);
    });

    test('prevents non-admin from assigning admin/supervisor', async () => {
      const result = await AdminService.changeUserRole('2', 'admin', 'supervisor');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Solo el administrador principal');
    });

    test('prevents changing main admin role', async () => {
      const saveMock = jest.fn();
      User.findById.mockResolvedValue({ _id: '1', username: 'admin', role: 'admin', save: saveMock });

      const result = await AdminService.changeUserRole('1', 'user', 'admin');

      expect(result.success).toBe(false);
      expect(result.error).toContain('administrador principal');
    });
  });

  describe('resetUserPassword', () => {
    test('resets password and returns temporary password', async () => {
      const saveMock = jest.fn().mockResolvedValue(undefined);
      const mockUser = { _id: '2', username: 'user2', password: 'old', mustChangePassword: false, save: saveMock };
      User.findById.mockResolvedValue(mockUser);

      const result = await AdminService.resetUserPassword('2');

      expect(result.success).toBe(true);
      expect(result.temporaryPassword).toBeDefined();
      expect(result.temporaryPassword.length).toBeGreaterThan(0);
      expect(mockUser.mustChangePassword).toBe(true);
    });

    test('returns error when user not found', async () => {
      User.findById.mockResolvedValue(null);

      const result = await AdminService.resetUserPassword('999');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Usuario no encontrado');
    });
  });

  describe('getUserRecords', () => {
    test('returns user records sorted by fecha desc', async () => {
      const mockRecords = [{ _id: 'r1', fecha: '2024-01-02' }, { _id: 'r2', fecha: '2024-01-01' }];
      Record.find.mockReturnValue(mockQuery(mockRecords));
      User.findById.mockResolvedValue({ _id: '2', username: 'user2' });

      const result = await AdminService.getUserRecords('2');

      expect(result.success).toBe(true);
      expect(result.records).toEqual(mockRecords);
      expect(result.username).toBe('user2');
    });

    test('returns error when user not found', async () => {
      User.findById.mockResolvedValue(null);

      const result = await AdminService.getUserRecords('999');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Usuario no encontrado');
    });
  });

  describe('editRecord', () => {
    test('edits record and creates modification log', async () => {
      const mockRecord = {
        _id: 'r1',
        fecha: '2024-01-01',
        horaInicio: '08:00',
        horaFin: '17:00',
        totalHoras: 9,
        parador: 'Base',
        notas: '',
        userId: { username: 'user2' },
      };
      Record.findById.mockReturnValue(mockQuery(mockRecord));
      const updatedRecord = { ...mockRecord, fecha: '2024-01-02', notas: 'updated' };
      Record.findByIdAndUpdate.mockReturnValue(mockQuery(updatedRecord));
      ModificationLog.create.mockResolvedValue({ _id: 'log1' });

      const result = await AdminService.editRecord(
        'r1',
        { fecha: '2024-01-02', notas: 'updated' },
        'admin'
      );

      expect(result.success).toBe(true);
      expect(result.record).toEqual(updatedRecord);
      expect(result.logId).toBe('log1');
    });

    test('returns error when record not found', async () => {
      Record.findById.mockReturnValue(mockQuery(null));

      const result = await AdminService.editRecord('r999', { notas: 'x' }, 'admin');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Registro no encontrado');
    });
  });

  describe('deleteRecord', () => {
    test('deletes record and creates modification log', async () => {
      const mockRecord = {
        _id: 'r1',
        fecha: '2024-01-01',
        horaInicio: '08:00',
        horaFin: '17:00',
        totalHoras: 9,
        parador: 'Base',
        notas: '',
        userId: { username: 'user2' },
      };
      Record.findById.mockReturnValue(mockQuery(mockRecord));
      Record.findByIdAndDelete.mockResolvedValue({});
      ModificationLog.create.mockResolvedValue({ _id: 'log2' });

      const result = await AdminService.deleteRecord('r1', 'reason', 'admin');

      expect(result.success).toBe(true);
      expect(result.logId).toBe('log2');
    });

    test('returns error when record not found', async () => {
      Record.findById.mockReturnValue(mockQuery(null));

      const result = await AdminService.deleteRecord('r999', 'reason', 'admin');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Registro no encontrado');
    });
  });

  describe('getAccessLogs', () => {
    test('returns paginated access logs', async () => {
      const mockLogs = [{ _id: 'l1' }, { _id: 'l2' }];
      AccessLog.find.mockReturnValue(mockQuery(mockLogs));
      AccessLog.countDocuments.mockResolvedValue(10);

      const result = await AdminService.getAccessLogs({ limit: 2, offset: 0 });

      expect(result.success).toBe(true);
      expect(result.logs).toEqual(mockLogs);
      expect(result.total).toBe(10);
    });

    test('filters by username and action', async () => {
      const mockLogs = [{ _id: 'l1' }];
      AccessLog.find.mockReturnValue(mockQuery(mockLogs));
      AccessLog.countDocuments.mockResolvedValue(1);

      const result = await AdminService.getAccessLogs({ username: 'admin', action: 'login' });

      expect(result.logs).toEqual(mockLogs);
    });
  });

  describe('getModificationLogs', () => {
    test('returns paginated modification logs', async () => {
      const mockLogs = [{ _id: 'm1' }];
      ModificationLog.find.mockReturnValue(mockQuery(mockLogs));
      ModificationLog.countDocuments.mockResolvedValue(5);

      const result = await AdminService.getModificationLogs({ limit: 1, offset: 0 });

      expect(result.success).toBe(true);
      expect(result.logs).toEqual(mockLogs);
      expect(result.total).toBe(5);
    });
  });
});
