// ── 对外暴露的用户字段（禁止返回密码哈希） ──
export function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    studentNo: user.studentNo,
    department: user.department,
    isActive: user.isActive,
    createdAt: user.createdAt,
  }
}
