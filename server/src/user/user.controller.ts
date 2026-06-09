import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { UserService, UserRole } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * 获取或创建用户（前端静默调用）
   * 根据 openid 获取用户信息，不存在则自动创建
   */
  @Get('info')
  async getUserInfo(
    @Query('openid') openid: string,
    @Query('nickname') nickname?: string,
    @Query('avatar') avatar?: string,
  ) {
    if (!openid) {
      return {
        code: 400,
        msg: 'openid 不能为空',
        data: null,
      };
    }

    const user = await this.userService.getOrCreateUser(openid, nickname, avatar);
    return {
      code: 0,
      msg: 'success',
      data: user,
    };
  }

  /**
   * 获取所有用户（管理员功能）
   */
  @Get('list')
  async getAllUsers(@Query('adminOpenid') adminOpenid: string) {
    // 验证是否是管理员
    const isAdmin = await this.userService.isAdmin(adminOpenid);
    if (!isAdmin) {
      return {
        code: 403,
        msg: '无权限',
        data: null,
      };
    }

    const users = await this.userService.getAllUsers();
    return {
      code: 0,
      msg: 'success',
      data: users,
    };
  }

  /**
   * 更新用户角色（管理员功能）
   */
  @Post('role')
  async updateUserRole(
    @Body() body: { adminOpenid: string; userId: string; role: UserRole },
  ) {
    const { adminOpenid, userId, role } = body;

    // 验证是否是管理员
    const isAdmin = await this.userService.isAdmin(adminOpenid);
    if (!isAdmin) {
      return {
        code: 403,
        msg: '无权限',
        data: null,
      };
    }

    // 验证角色值
    if (!['admin', 'member', 'user'].includes(role)) {
      return {
        code: 400,
        msg: '无效的角色',
        data: null,
      };
    }

    const user = await this.userService.updateUserRole(userId, role);
    return {
      code: 0,
      msg: 'success',
      data: user,
    };
  }

  /**
   * 检查用户权限
   */
  @Get('check-role')
  async checkRole(
    @Query('openid') openid: string,
  ) {
    const isAdmin = await this.userService.isAdmin(openid);
    const isMember = await this.userService.isMember(openid);

    return {
      code: 0,
      msg: 'success',
      data: {
        isAdmin,
        isMember,
      },
    };
  }
}
