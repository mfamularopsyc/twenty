import { PermissionFlagType } from 'twenty-shared/constants';
import { isNonEmptyArray } from 'twenty-shared/utils';

import { type FlatViewMaps } from 'src/engine/metadata-modules/flat-view/types/flat-view-maps.type';
import { findFlatEntityByIdInFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps.util';
import { type PageLayoutViewMutationAuthContext } from 'src/engine/metadata-modules/page-layout/types/page-layout-view-mutation-auth-context.type';
import { PermissionsService } from 'src/engine/metadata-modules/permissions/permissions.service';
import {
  ViewException,
  ViewExceptionCode,
  ViewExceptionMessageKey,
  generateViewExceptionMessage,
  generateViewUserFriendlyExceptionMessage,
} from 'src/engine/metadata-modules/view/exceptions/view.exception';

export const assertCanModifyLockedWidgetBackedViews = async ({
  viewIds,
  flatViewMaps,
  workspaceId,
  authContext,
  permissionsService,
}: {
  viewIds: string[];
  flatViewMaps: FlatViewMaps;
  workspaceId: string;
  authContext: PageLayoutViewMutationAuthContext;
  permissionsService: PermissionsService;
}): Promise<void> => {
  const uniqueViewIds = [...new Set(viewIds)];

  if (!isNonEmptyArray(uniqueViewIds)) {
    return;
  }

  const hasLockedView = uniqueViewIds.some((viewId) => {
    const flatView = findFlatEntityByIdInFlatEntityMaps({
      flatEntityId: viewId,
      flatEntityMaps: flatViewMaps,
    });

    return flatView?.isLocked === true;
  });

  if (!hasLockedView) {
    return;
  }

  const hasViewsPermission =
    await permissionsService.userHasWorkspaceSettingPermission({
      workspaceId,
      userWorkspaceId: authContext.userWorkspaceId,
      apiKeyId: authContext.apiKeyId,
      applicationId: authContext.applicationId,
      setting: PermissionFlagType.VIEWS,
    });

  if (hasViewsPermission === true) {
    return;
  }

  throw new ViewException(
    generateViewExceptionMessage(
      ViewExceptionMessageKey.VIEW_LOCKED_PERMISSION_DENIED,
    ),
    ViewExceptionCode.VIEW_LOCKED_PERMISSION_DENIED,
    {
      userFriendlyMessage: generateViewUserFriendlyExceptionMessage(
        ViewExceptionMessageKey.VIEW_LOCKED_PERMISSION_DENIED,
      ),
    },
  );
};
