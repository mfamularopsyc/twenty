import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';

import { WorkspaceManyOrAllFlatEntityMapsCacheService } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.service';
import { findFlatEntityByIdInFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps.util';
import { isFlatPageLayoutWidgetConfigurationOfType } from 'src/engine/metadata-modules/flat-page-layout-widget/utils/is-flat-page-layout-widget-configuration-of-type.util';
import { WidgetConfigurationType } from 'src/engine/metadata-modules/page-layout-widget/enums/widget-configuration-type.type';
import { ViewAccessService } from 'src/engine/metadata-modules/view-permissions/services/view-access.service';
import {
  extractWidgetIdFromArgsAndRequest,
  getViewPermissionGuardRequestAndArgs,
} from 'src/engine/metadata-modules/view-permissions/guards/utils/view-permission-guard.util';

@Injectable()
export class UpsertFieldsWidgetPermissionGuard implements CanActivate {
  constructor(
    private readonly viewAccessService: ViewAccessService,
    private readonly workspaceManyOrAllFlatEntityMapsCacheService: WorkspaceManyOrAllFlatEntityMapsCacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { args, request } = getViewPermissionGuardRequestAndArgs(context);
    const widgetId = extractWidgetIdFromArgsAndRequest({ args, request });

    if (!widgetId) {
      return this.viewAccessService.canUserModifyViewByChildEntity(
        null,
        request.userWorkspaceId,
        request.workspace.id,
        request.apiKey?.id,
      );
    }

    const { flatPageLayoutWidgetMaps } =
      await this.workspaceManyOrAllFlatEntityMapsCacheService.getOrRecomputeManyOrAllFlatEntityMaps(
        {
          workspaceId: request.workspace.id,
          flatMapsKeys: ['flatPageLayoutWidgetMaps'],
        },
      );

    const widget = findFlatEntityByIdInFlatEntityMaps({
      flatEntityId: widgetId,
      flatEntityMaps: flatPageLayoutWidgetMaps,
    });

    const viewId =
      widget &&
      isFlatPageLayoutWidgetConfigurationOfType(
        widget,
        WidgetConfigurationType.FIELDS,
      )
        ? widget.configuration.viewId
        : null;

    return this.viewAccessService.canUserModifyViewByChildEntity(
      viewId,
      request.userWorkspaceId,
      request.workspace.id,
      request.apiKey?.id,
    );
  }
}
