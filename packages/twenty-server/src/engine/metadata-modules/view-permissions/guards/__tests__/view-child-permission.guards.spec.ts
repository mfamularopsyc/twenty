import { type ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

import { WidgetConfigurationType } from 'src/engine/metadata-modules/page-layout-widget/enums/widget-configuration-type.type';
import { ViewExceptionCode } from 'src/engine/metadata-modules/view/exceptions/view.exception';
import { CreateViewFieldGroupPermissionGuard } from 'src/engine/metadata-modules/view-permissions/guards/create-view-field-group-permission.guard';
import { CreateViewFieldPermissionGuard } from 'src/engine/metadata-modules/view-permissions/guards/create-view-field-permission.guard';
import { CreateViewFilterGroupPermissionGuard } from 'src/engine/metadata-modules/view-permissions/guards/create-view-filter-group-permission.guard';
import { CreateViewGroupPermissionGuard } from 'src/engine/metadata-modules/view-permissions/guards/create-view-group-permission.guard';
import { CreateViewSortPermissionGuard } from 'src/engine/metadata-modules/view-permissions/guards/create-view-sort-permission.guard';
import { DeleteViewFieldGroupPermissionGuard } from 'src/engine/metadata-modules/view-permissions/guards/delete-view-field-group-permission.guard';
import { DeleteViewFieldPermissionGuard } from 'src/engine/metadata-modules/view-permissions/guards/delete-view-field-permission.guard';
import { DeleteViewFilterGroupPermissionGuard } from 'src/engine/metadata-modules/view-permissions/guards/delete-view-filter-group-permission.guard';
import { DeleteViewFilterPermissionGuard } from 'src/engine/metadata-modules/view-permissions/guards/delete-view-filter-permission.guard';
import { DeleteViewGroupPermissionGuard } from 'src/engine/metadata-modules/view-permissions/guards/delete-view-group-permission.guard';
import { DeleteViewSortPermissionGuard } from 'src/engine/metadata-modules/view-permissions/guards/delete-view-sort-permission.guard';
import { DestroyViewFieldGroupPermissionGuard } from 'src/engine/metadata-modules/view-permissions/guards/destroy-view-field-group-permission.guard';
import { DestroyViewFieldPermissionGuard } from 'src/engine/metadata-modules/view-permissions/guards/destroy-view-field-permission.guard';
import { DestroyViewFilterGroupPermissionGuard } from 'src/engine/metadata-modules/view-permissions/guards/destroy-view-filter-group-permission.guard';
import { DestroyViewFilterPermissionGuard } from 'src/engine/metadata-modules/view-permissions/guards/destroy-view-filter-permission.guard';
import { DestroyViewGroupPermissionGuard } from 'src/engine/metadata-modules/view-permissions/guards/destroy-view-group-permission.guard';
import { DestroyViewSortPermissionGuard } from 'src/engine/metadata-modules/view-permissions/guards/destroy-view-sort-permission.guard';
import { UpdateViewFieldGroupPermissionGuard } from 'src/engine/metadata-modules/view-permissions/guards/update-view-field-group-permission.guard';
import { UpdateViewFieldPermissionGuard } from 'src/engine/metadata-modules/view-permissions/guards/update-view-field-permission.guard';
import { UpdateViewFilterGroupPermissionGuard } from 'src/engine/metadata-modules/view-permissions/guards/update-view-filter-group-permission.guard';
import { UpdateViewFilterPermissionGuard } from 'src/engine/metadata-modules/view-permissions/guards/update-view-filter-permission.guard';
import { UpdateViewGroupPermissionGuard } from 'src/engine/metadata-modules/view-permissions/guards/update-view-group-permission.guard';
import { UpdateViewSortPermissionGuard } from 'src/engine/metadata-modules/view-permissions/guards/update-view-sort-permission.guard';
import { UpsertFieldsWidgetPermissionGuard } from 'src/engine/metadata-modules/view-permissions/guards/upsert-fields-widget-permission.guard';
import { type ViewAccessService } from 'src/engine/metadata-modules/view-permissions/services/view-access.service';
import { type ViewEntityLookupService } from 'src/engine/metadata-modules/view-permissions/services/view-entity-lookup.service';

describe('view child permission guards', () => {
  const workspaceId = 'workspace-id';
  const userWorkspaceId = 'regular-user-workspace-id';
  const unlockedViewId = 'unlocked-view-id';
  const lockedViewId = 'locked-view-id';
  const unlockedEntityId = 'unlocked-entity-id';
  const lockedEntityId = 'locked-entity-id';
  const widgetId = 'widget-id';
  const lockedViewError = Object.assign(new Error('Locked view'), {
    code: ViewExceptionCode.VIEW_LOCKED_PERMISSION_DENIED,
  });
  const graphQLExecutionContext = {
    getType: () => 'graphql',
  } as ExecutionContext;

  const viewAccessService = {
    canUserModifyViewByChildEntity: jest.fn(),
  };

  const viewEntityLookupService = {
    findViewIdByEntityIdAndKind: jest.fn(),
  };

  const workspaceManyOrAllFlatEntityMapsCacheService = {
    getOrRecomputeManyOrAllFlatEntityMaps: jest.fn(),
  };

  const mockGqlExecutionContext = (args: Record<string, unknown>) => {
    jest.spyOn(GqlExecutionContext, 'create').mockReturnValue({
      getContext: () => ({
        req: {
          userWorkspaceId,
          workspace: { id: workspaceId },
          body: {},
          params: {},
        },
      }),
      getArgs: () => args,
    } as never);
  };

  const mockHttpExecutionContext = ({
    body = {},
    params = {},
  }: {
    body?: Record<string, unknown>;
    params?: Record<string, unknown>;
  }) =>
    ({
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => ({
          userWorkspaceId,
          workspace: { id: workspaceId },
          body,
          params,
        }),
      }),
    }) as ExecutionContext;

  const mockLockedViewAccess = () => {
    viewAccessService.canUserModifyViewByChildEntity.mockImplementation(
      async (viewId: string | null) => {
        if (viewId === lockedViewId) {
          throw lockedViewError;
        }

        return true;
      },
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLockedViewAccess();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe.each([
    [
      'createManyViewFields',
      () =>
        new CreateViewFieldPermissionGuard(
          viewAccessService as unknown as ViewAccessService,
        ),
    ],
    [
      'createManyViewGroups',
      () =>
        new CreateViewGroupPermissionGuard(
          viewAccessService as unknown as ViewAccessService,
        ),
    ],
    [
      'createManyViewFieldGroups',
      () =>
        new CreateViewFieldGroupPermissionGuard(
          viewAccessService as unknown as ViewAccessService,
        ),
    ],
  ])('%s', (_, buildGuard) => {
    it('rejects regular users when a later bulk input targets a locked view', async () => {
      mockGqlExecutionContext({
        inputs: [{ viewId: unlockedViewId }, { viewId: lockedViewId }],
      });

      await expect(
        buildGuard().canActivate(graphQLExecutionContext),
      ).rejects.toMatchObject({
        code: ViewExceptionCode.VIEW_LOCKED_PERMISSION_DENIED,
      });

      expect(
        viewAccessService.canUserModifyViewByChildEntity,
      ).toHaveBeenCalledWith(
        unlockedViewId,
        userWorkspaceId,
        workspaceId,
        undefined,
      );
      expect(
        viewAccessService.canUserModifyViewByChildEntity,
      ).toHaveBeenCalledWith(
        lockedViewId,
        userWorkspaceId,
        workspaceId,
        undefined,
      );
    });

    it('allows users with VIEWS permission when every bulk input is authorized', async () => {
      mockGqlExecutionContext({
        inputs: [{ viewId: unlockedViewId }, { viewId: lockedViewId }],
      });
      viewAccessService.canUserModifyViewByChildEntity.mockResolvedValue(true);

      await expect(
        buildGuard().canActivate(graphQLExecutionContext),
      ).resolves.toBe(true);

      expect(
        viewAccessService.canUserModifyViewByChildEntity,
      ).toHaveBeenCalledTimes(2);
    });
  });

  describe.each([
    [
      'createViewField',
      () =>
        new CreateViewFieldPermissionGuard(
          viewAccessService as unknown as ViewAccessService,
        ),
    ],
    [
      'createViewSort',
      () =>
        new CreateViewSortPermissionGuard(
          viewAccessService as unknown as ViewAccessService,
        ),
    ],
    [
      'createViewFilterGroup',
      () =>
        new CreateViewFilterGroupPermissionGuard(
          viewAccessService as unknown as ViewAccessService,
        ),
    ],
  ])('%s with REST request body', (_, buildGuard) => {
    it('rejects regular users by extracting viewId from the HTTP request body', async () => {
      const gqlExecutionContextCreateSpy = jest.spyOn(
        GqlExecutionContext,
        'create',
      );

      await expect(
        buildGuard().canActivate(
          mockHttpExecutionContext({ body: { viewId: lockedViewId } }),
        ),
      ).rejects.toMatchObject({
        code: ViewExceptionCode.VIEW_LOCKED_PERMISSION_DENIED,
      });

      expect(gqlExecutionContextCreateSpy).not.toHaveBeenCalled();
      expect(
        viewAccessService.canUserModifyViewByChildEntity,
      ).toHaveBeenCalledWith(
        lockedViewId,
        userWorkspaceId,
        workspaceId,
        undefined,
      );
    });
  });

  describe('updateManyViewGroups', () => {
    const buildGuard = () =>
      new UpdateViewGroupPermissionGuard(
        viewAccessService as unknown as ViewAccessService,
        viewEntityLookupService as unknown as ViewEntityLookupService,
      );

    beforeEach(() => {
      viewEntityLookupService.findViewIdByEntityIdAndKind.mockImplementation(
        async (_kind: string, entityId: string) => {
          if (entityId === lockedEntityId) {
            return lockedViewId;
          }

          return unlockedViewId;
        },
      );
    });

    it('rejects regular users when a later update input targets a locked view group', async () => {
      mockGqlExecutionContext({
        inputs: [{ id: unlockedEntityId }, { id: lockedEntityId }],
      });

      await expect(
        buildGuard().canActivate(graphQLExecutionContext),
      ).rejects.toMatchObject({
        code: ViewExceptionCode.VIEW_LOCKED_PERMISSION_DENIED,
      });

      expect(
        viewEntityLookupService.findViewIdByEntityIdAndKind,
      ).toHaveBeenCalledWith('viewGroup', unlockedEntityId, workspaceId);
      expect(
        viewEntityLookupService.findViewIdByEntityIdAndKind,
      ).toHaveBeenCalledWith('viewGroup', lockedEntityId, workspaceId);
      expect(
        viewAccessService.canUserModifyViewByChildEntity,
      ).toHaveBeenCalledWith(
        lockedViewId,
        userWorkspaceId,
        workspaceId,
        undefined,
      );
    });

    it('allows users with VIEWS permission when every update input is authorized', async () => {
      mockGqlExecutionContext({
        inputs: [{ id: unlockedEntityId }, { id: lockedEntityId }],
      });
      viewAccessService.canUserModifyViewByChildEntity.mockResolvedValue(true);

      await expect(
        buildGuard().canActivate(graphQLExecutionContext),
      ).resolves.toBe(true);

      expect(
        viewAccessService.canUserModifyViewByChildEntity,
      ).toHaveBeenCalledTimes(2);
    });
  });

  describe.each([
    [
      'updateViewField',
      'viewField',
      () =>
        new UpdateViewFieldPermissionGuard(
          viewAccessService as unknown as ViewAccessService,
          viewEntityLookupService as unknown as ViewEntityLookupService,
        ),
    ],
    [
      'deleteViewField',
      'viewField',
      () =>
        new DeleteViewFieldPermissionGuard(
          viewAccessService as unknown as ViewAccessService,
          viewEntityLookupService as unknown as ViewEntityLookupService,
        ),
    ],
    [
      'destroyViewField',
      'viewField',
      () =>
        new DestroyViewFieldPermissionGuard(
          viewAccessService as unknown as ViewAccessService,
          viewEntityLookupService as unknown as ViewEntityLookupService,
        ),
    ],
    [
      'updateViewFieldGroup',
      'viewFieldGroup',
      () =>
        new UpdateViewFieldGroupPermissionGuard(
          viewAccessService as unknown as ViewAccessService,
          viewEntityLookupService as unknown as ViewEntityLookupService,
        ),
    ],
    [
      'deleteViewFieldGroup',
      'viewFieldGroup',
      () =>
        new DeleteViewFieldGroupPermissionGuard(
          viewAccessService as unknown as ViewAccessService,
          viewEntityLookupService as unknown as ViewEntityLookupService,
        ),
    ],
    [
      'destroyViewFieldGroup',
      'viewFieldGroup',
      () =>
        new DestroyViewFieldGroupPermissionGuard(
          viewAccessService as unknown as ViewAccessService,
          viewEntityLookupService as unknown as ViewEntityLookupService,
        ),
    ],
    [
      'updateViewFilter',
      'viewFilter',
      () =>
        new UpdateViewFilterPermissionGuard(
          viewAccessService as unknown as ViewAccessService,
          viewEntityLookupService as unknown as ViewEntityLookupService,
        ),
    ],
    [
      'deleteViewFilter',
      'viewFilter',
      () =>
        new DeleteViewFilterPermissionGuard(
          viewAccessService as unknown as ViewAccessService,
          viewEntityLookupService as unknown as ViewEntityLookupService,
        ),
    ],
    [
      'destroyViewFilter',
      'viewFilter',
      () =>
        new DestroyViewFilterPermissionGuard(
          viewAccessService as unknown as ViewAccessService,
          viewEntityLookupService as unknown as ViewEntityLookupService,
        ),
    ],
    [
      'updateViewFilterGroup',
      'viewFilterGroup',
      () =>
        new UpdateViewFilterGroupPermissionGuard(
          viewAccessService as unknown as ViewAccessService,
          viewEntityLookupService as unknown as ViewEntityLookupService,
        ),
    ],
    [
      'deleteViewFilterGroup',
      'viewFilterGroup',
      () =>
        new DeleteViewFilterGroupPermissionGuard(
          viewAccessService as unknown as ViewAccessService,
          viewEntityLookupService as unknown as ViewEntityLookupService,
        ),
    ],
    [
      'destroyViewFilterGroup',
      'viewFilterGroup',
      () =>
        new DestroyViewFilterGroupPermissionGuard(
          viewAccessService as unknown as ViewAccessService,
          viewEntityLookupService as unknown as ViewEntityLookupService,
        ),
    ],
    [
      'deleteViewGroup',
      'viewGroup',
      () =>
        new DeleteViewGroupPermissionGuard(
          viewAccessService as unknown as ViewAccessService,
          viewEntityLookupService as unknown as ViewEntityLookupService,
        ),
    ],
    [
      'destroyViewGroup',
      'viewGroup',
      () =>
        new DestroyViewGroupPermissionGuard(
          viewAccessService as unknown as ViewAccessService,
          viewEntityLookupService as unknown as ViewEntityLookupService,
        ),
    ],
  ])('%s with REST params.id', (_, kind, buildGuard) => {
    beforeEach(() => {
      viewEntityLookupService.findViewIdByEntityIdAndKind.mockResolvedValue(
        lockedViewId,
      );
    });

    it('rejects regular users when the REST target belongs to a locked view', async () => {
      const gqlExecutionContextCreateSpy = jest.spyOn(
        GqlExecutionContext,
        'create',
      );

      await expect(
        buildGuard().canActivate(
          mockHttpExecutionContext({ params: { id: lockedEntityId } }),
        ),
      ).rejects.toMatchObject({
        code: ViewExceptionCode.VIEW_LOCKED_PERMISSION_DENIED,
      });

      expect(gqlExecutionContextCreateSpy).not.toHaveBeenCalled();
      expect(
        viewEntityLookupService.findViewIdByEntityIdAndKind,
      ).toHaveBeenCalledWith(kind, lockedEntityId, workspaceId);
      expect(
        viewAccessService.canUserModifyViewByChildEntity,
      ).toHaveBeenCalledWith(
        lockedViewId,
        userWorkspaceId,
        workspaceId,
        undefined,
      );
    });

    it('allows users with VIEWS permission when the REST target belongs to a locked view', async () => {
      viewAccessService.canUserModifyViewByChildEntity.mockResolvedValue(true);

      await expect(
        buildGuard().canActivate(
          mockHttpExecutionContext({ params: { id: lockedEntityId } }),
        ),
      ).resolves.toBe(true);

      expect(
        viewEntityLookupService.findViewIdByEntityIdAndKind,
      ).toHaveBeenCalledWith(kind, lockedEntityId, workspaceId);
      expect(
        viewAccessService.canUserModifyViewByChildEntity,
      ).toHaveBeenCalledWith(
        lockedViewId,
        userWorkspaceId,
        workspaceId,
        undefined,
      );
    });
  });

  it('extracts child entity id from REST request body when URL params are absent', async () => {
    viewEntityLookupService.findViewIdByEntityIdAndKind.mockResolvedValue(
      lockedViewId,
    );

    await expect(
      new UpdateViewFieldPermissionGuard(
        viewAccessService as unknown as ViewAccessService,
        viewEntityLookupService as unknown as ViewEntityLookupService,
      ).canActivate(mockHttpExecutionContext({ body: { id: lockedEntityId } })),
    ).rejects.toMatchObject({
      code: ViewExceptionCode.VIEW_LOCKED_PERMISSION_DENIED,
    });

    expect(
      viewEntityLookupService.findViewIdByEntityIdAndKind,
    ).toHaveBeenCalledWith('viewField', lockedEntityId, workspaceId);
    expect(viewAccessService.canUserModifyViewByChildEntity).toHaveBeenCalled();
  });

  describe('upsertFieldsWidget', () => {
    const buildGuard = () =>
      new UpsertFieldsWidgetPermissionGuard(
        viewAccessService as unknown as ViewAccessService,
        workspaceManyOrAllFlatEntityMapsCacheService as never,
      );

    beforeEach(() => {
      workspaceManyOrAllFlatEntityMapsCacheService.getOrRecomputeManyOrAllFlatEntityMaps.mockResolvedValue(
        {
          flatPageLayoutWidgetMaps: {
            universalIdentifierById: {
              [widgetId]: 'widget-universal-identifier',
            },
            byUniversalIdentifier: {
              'widget-universal-identifier': {
                id: widgetId,
                configuration: {
                  configurationType: WidgetConfigurationType.FIELDS,
                  viewId: lockedViewId,
                },
              },
            },
          },
        },
      );
    });

    it('rejects regular users when the fields widget targets a locked view', async () => {
      mockGqlExecutionContext({
        input: { widgetId },
      });

      await expect(
        buildGuard().canActivate(graphQLExecutionContext),
      ).rejects.toMatchObject({
        code: ViewExceptionCode.VIEW_LOCKED_PERMISSION_DENIED,
      });

      expect(
        viewAccessService.canUserModifyViewByChildEntity,
      ).toHaveBeenCalledWith(
        lockedViewId,
        userWorkspaceId,
        workspaceId,
        undefined,
      );
    });

    it('rejects regular users by extracting widgetId from the REST request body', async () => {
      const gqlExecutionContextCreateSpy = jest.spyOn(
        GqlExecutionContext,
        'create',
      );

      await expect(
        buildGuard().canActivate(mockHttpExecutionContext({ body: { widgetId } })),
      ).rejects.toMatchObject({
        code: ViewExceptionCode.VIEW_LOCKED_PERMISSION_DENIED,
      });

      expect(gqlExecutionContextCreateSpy).not.toHaveBeenCalled();
      expect(
        viewAccessService.canUserModifyViewByChildEntity,
      ).toHaveBeenCalledWith(
        lockedViewId,
        userWorkspaceId,
        workspaceId,
        undefined,
      );
    });

    it('allows users with VIEWS permission to upsert fields widgets for locked views', async () => {
      mockGqlExecutionContext({
        input: { widgetId },
      });
      viewAccessService.canUserModifyViewByChildEntity.mockResolvedValue(true);

      await expect(
        buildGuard().canActivate(graphQLExecutionContext),
      ).resolves.toBe(true);

      expect(
        viewAccessService.canUserModifyViewByChildEntity,
      ).toHaveBeenCalledWith(
        lockedViewId,
        userWorkspaceId,
        workspaceId,
        undefined,
      );
    });
  });

  describe.each([
    [
      'updateViewSort',
      () =>
        new UpdateViewSortPermissionGuard(
          viewAccessService as unknown as ViewAccessService,
          viewEntityLookupService as unknown as ViewEntityLookupService,
        ),
    ],
    [
      'deleteViewSort',
      () =>
        new DeleteViewSortPermissionGuard(
          viewAccessService as unknown as ViewAccessService,
          viewEntityLookupService as unknown as ViewEntityLookupService,
        ),
    ],
    [
      'destroyViewSort',
      () =>
        new DestroyViewSortPermissionGuard(
          viewAccessService as unknown as ViewAccessService,
          viewEntityLookupService as unknown as ViewEntityLookupService,
        ),
    ],
  ])('%s', (_, buildGuard) => {
    beforeEach(() => {
      viewEntityLookupService.findViewIdByEntityIdAndKind.mockResolvedValue(
        lockedViewId,
      );
    });

    it('rejects regular users when args.input.id targets a locked view sort', async () => {
      mockGqlExecutionContext({
        input: { id: lockedEntityId },
      });

      await expect(
        buildGuard().canActivate(graphQLExecutionContext),
      ).rejects.toMatchObject({
        code: ViewExceptionCode.VIEW_LOCKED_PERMISSION_DENIED,
      });

      expect(
        viewEntityLookupService.findViewIdByEntityIdAndKind,
      ).toHaveBeenCalledWith('viewSort', lockedEntityId, workspaceId);
      expect(
        viewAccessService.canUserModifyViewByChildEntity,
      ).toHaveBeenCalledWith(
        lockedViewId,
        userWorkspaceId,
        workspaceId,
        undefined,
      );
    });

    it('allows users with VIEWS permission when args.input.id targets a locked view sort', async () => {
      mockGqlExecutionContext({
        input: { id: lockedEntityId },
      });
      viewAccessService.canUserModifyViewByChildEntity.mockResolvedValue(true);

      await expect(
        buildGuard().canActivate(graphQLExecutionContext),
      ).resolves.toBe(true);

      expect(
        viewEntityLookupService.findViewIdByEntityIdAndKind,
      ).toHaveBeenCalledWith('viewSort', lockedEntityId, workspaceId);
      expect(
        viewAccessService.canUserModifyViewByChildEntity,
      ).toHaveBeenCalledWith(
        lockedViewId,
        userWorkspaceId,
        workspaceId,
        undefined,
      );
    });

    it('rejects regular users when REST params.id targets a locked view sort', async () => {
      await expect(
        buildGuard().canActivate(
          mockHttpExecutionContext({ params: { id: lockedEntityId } }),
        ),
      ).rejects.toMatchObject({
        code: ViewExceptionCode.VIEW_LOCKED_PERMISSION_DENIED,
      });

      expect(
        viewEntityLookupService.findViewIdByEntityIdAndKind,
      ).toHaveBeenCalledWith('viewSort', lockedEntityId, workspaceId);
      expect(
        viewAccessService.canUserModifyViewByChildEntity,
      ).toHaveBeenCalledWith(
        lockedViewId,
        userWorkspaceId,
        workspaceId,
        undefined,
      );
    });

    it('allows users with VIEWS permission when REST params.id targets a locked view sort', async () => {
      viewAccessService.canUserModifyViewByChildEntity.mockResolvedValue(true);

      await expect(
        buildGuard().canActivate(
          mockHttpExecutionContext({ params: { id: lockedEntityId } }),
        ),
      ).resolves.toBe(true);

      expect(
        viewEntityLookupService.findViewIdByEntityIdAndKind,
      ).toHaveBeenCalledWith('viewSort', lockedEntityId, workspaceId);
      expect(
        viewAccessService.canUserModifyViewByChildEntity,
      ).toHaveBeenCalledWith(
        lockedViewId,
        userWorkspaceId,
        workspaceId,
        undefined,
      );
    });
  });
});
