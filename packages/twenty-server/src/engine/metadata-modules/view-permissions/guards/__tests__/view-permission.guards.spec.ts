import { type ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

import { ViewVisibility } from 'twenty-shared/types';

import { ViewExceptionCode } from 'src/engine/metadata-modules/view/exceptions/view.exception';
import { CreateViewPermissionGuard } from 'src/engine/metadata-modules/view-permissions/guards/create-view-permission.guard';
import { DeleteViewPermissionGuard } from 'src/engine/metadata-modules/view-permissions/guards/delete-view-permission.guard';
import { DestroyViewPermissionGuard } from 'src/engine/metadata-modules/view-permissions/guards/destroy-view-permission.guard';
import { UpdateViewPermissionGuard } from 'src/engine/metadata-modules/view-permissions/guards/update-view-permission.guard';
import { type ViewAccessService } from 'src/engine/metadata-modules/view-permissions/services/view-access.service';

describe('view permission guards', () => {
  const workspaceId = 'workspace-id';
  const userWorkspaceId = 'regular-user-workspace-id';
  const lockedViewId = 'locked-view-id';
  const lockedViewError = Object.assign(new Error('Locked view'), {
    code: ViewExceptionCode.VIEW_LOCKED_PERMISSION_DENIED,
  });
  const graphQLExecutionContext = {
    getType: () => 'graphql',
  } as ExecutionContext;

  const viewAccessService = {
    canUserCreateView: jest.fn(),
    canUserModifyView: jest.fn(),
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

  beforeEach(() => {
    jest.clearAllMocks();
    viewAccessService.canUserCreateView.mockResolvedValue(true);
    viewAccessService.canUserModifyView.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rejects regular users creating locked views through REST request body', async () => {
    viewAccessService.canUserCreateView.mockRejectedValue(lockedViewError);

    const gqlExecutionContextCreateSpy = jest.spyOn(
      GqlExecutionContext,
      'create',
    );

    await expect(
      new CreateViewPermissionGuard(
        viewAccessService as unknown as ViewAccessService,
      ).canActivate(
        mockHttpExecutionContext({
          body: {
            visibility: ViewVisibility.WORKSPACE,
            isLocked: true,
          },
        }),
      ),
    ).rejects.toMatchObject({
      code: ViewExceptionCode.VIEW_LOCKED_PERMISSION_DENIED,
    });

    expect(gqlExecutionContextCreateSpy).not.toHaveBeenCalled();
    expect(viewAccessService.canUserCreateView).toHaveBeenCalledWith(
      ViewVisibility.WORKSPACE,
      true,
      userWorkspaceId,
      workspaceId,
      undefined,
    );
  });

  describe.each([
    [
      'updateView',
      () =>
        new UpdateViewPermissionGuard(
          viewAccessService as unknown as ViewAccessService,
        ),
      {
        isLockUpdateRequested: false,
      },
    ],
    [
      'deleteView',
      () =>
        new DeleteViewPermissionGuard(
          viewAccessService as unknown as ViewAccessService,
        ),
      undefined,
    ],
    [
      'destroyView',
      () =>
        new DestroyViewPermissionGuard(
          viewAccessService as unknown as ViewAccessService,
        ),
      undefined,
    ],
  ])('%s with REST params.id', (_, buildGuard, expectedOptions) => {
    it('rejects regular users when the REST target is a locked view', async () => {
      viewAccessService.canUserModifyView.mockRejectedValue(lockedViewError);

      const gqlExecutionContextCreateSpy = jest.spyOn(
        GqlExecutionContext,
        'create',
      );

      await expect(
        buildGuard().canActivate(
          mockHttpExecutionContext({ params: { id: lockedViewId } }),
        ),
      ).rejects.toMatchObject({
        code: ViewExceptionCode.VIEW_LOCKED_PERMISSION_DENIED,
      });

      expect(gqlExecutionContextCreateSpy).not.toHaveBeenCalled();
      expect(viewAccessService.canUserModifyView).toHaveBeenCalledWith(
        lockedViewId,
        userWorkspaceId,
        workspaceId,
        undefined,
        ...(expectedOptions === undefined ? [] : [expectedOptions]),
      );
    });

    it('allows users with VIEWS permission when the REST target is a locked view', async () => {
      viewAccessService.canUserModifyView.mockResolvedValue(true);

      await expect(
        buildGuard().canActivate(
          mockHttpExecutionContext({ params: { id: lockedViewId } }),
        ),
      ).resolves.toBe(true);

      expect(viewAccessService.canUserModifyView).toHaveBeenCalledWith(
        lockedViewId,
        userWorkspaceId,
        workspaceId,
        undefined,
        ...(expectedOptions === undefined ? [] : [expectedOptions]),
      );
    });
  });

  it('extracts view id and lock-update intent from GraphQL update args', async () => {
    mockGqlExecutionContext({
      id: lockedViewId,
      input: { isLocked: true },
    });

    await expect(
      new UpdateViewPermissionGuard(
        viewAccessService as unknown as ViewAccessService,
      ).canActivate(graphQLExecutionContext),
    ).resolves.toBe(true);

    expect(viewAccessService.canUserModifyView).toHaveBeenCalledWith(
      lockedViewId,
      userWorkspaceId,
      workspaceId,
      undefined,
      { isLockUpdateRequested: true },
    );
  });
});
