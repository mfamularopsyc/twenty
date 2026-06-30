import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';

import { ViewAccessService } from 'src/engine/metadata-modules/view-permissions/services/view-access.service';
import {
  extractCreateViewPermissionInputFromArgsAndRequest,
  getViewPermissionGuardRequestAndArgs,
} from 'src/engine/metadata-modules/view-permissions/guards/utils/view-permission-guard.util';

@Injectable()
export class CreateViewPermissionGuard implements CanActivate {
  constructor(private readonly viewAccessService: ViewAccessService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { args, request } = getViewPermissionGuardRequestAndArgs(context);
    const { visibility, isLocked } =
      extractCreateViewPermissionInputFromArgsAndRequest({ args, request });

    return this.viewAccessService.canUserCreateView(
      visibility,
      isLocked,
      request.userWorkspaceId,
      request.workspace.id,
      request.apiKey?.id,
    );
  }
}
