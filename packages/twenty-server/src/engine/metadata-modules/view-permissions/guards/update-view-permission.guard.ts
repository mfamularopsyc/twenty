import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';

import { ViewAccessService } from 'src/engine/metadata-modules/view-permissions/services/view-access.service';
import {
  extractIsLockUpdateRequestedFromArgsAndRequest,
  extractViewIdFromArgsAndRequest,
  getViewPermissionGuardRequestAndArgs,
} from 'src/engine/metadata-modules/view-permissions/guards/utils/view-permission-guard.util';

@Injectable()
export class UpdateViewPermissionGuard implements CanActivate {
  constructor(private readonly viewAccessService: ViewAccessService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { args, request } = getViewPermissionGuardRequestAndArgs(context);
    const viewId = extractViewIdFromArgsAndRequest({ args, request });
    const isLockUpdateRequested =
      extractIsLockUpdateRequestedFromArgsAndRequest({ args, request });

    return this.viewAccessService.canUserModifyView(
      viewId,
      request.userWorkspaceId,
      request.workspace.id,
      request.apiKey?.id,
      { isLockUpdateRequested },
    );
  }
}
