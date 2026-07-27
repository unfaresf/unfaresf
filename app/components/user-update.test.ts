import { vi, it, expect, describe, afterEach } from "vitest";
import {
  mountSuspended,
  registerEndpoint,
  mockNuxtImport,
} from "@nuxt/test-utils/runtime";
import { flushPromises } from "@vue/test-utils";
import { readBody, createError, type H3Event } from "h3";
import { UserUpdate } from "#components";
import { Roles } from "../../db/schema";
import type { GetUser } from "../../db/schema";

const { toastAdd } = vi.hoisted(() => ({ toastAdd: vi.fn() }));
mockNuxtImport("useToast", () => () => ({ add: toastAdd }));

const mockUser: GetUser = {
  id: 123,
  userName: "testuser",
  createdAt: new Date("May 15, 2025 04:00:00"),
  roles: [Roles.Editor],
};

const cleanups: Array<() => void> = [];
afterEach(() => {
  toastAdd.mockClear();
  while (cleanups.length) cleanups.pop()!();
});

const userEndpoint = `/api/users/${mockUser.id}`;

describe("UserUpdate", () => {
  it("renders the username in a disabled input", async () => {
    const component = await mountSuspended(UserUpdate, {
      props: { user: mockUser },
    });
    const input = component.find("input");
    expect(input.attributes("disabled")).toBeDefined();
    expect((input.element as HTMLInputElement).value).toBe("testuser");
  });

  it("shows the user's current roles in the select menu trigger", async () => {
    const component = await mountSuspended(UserUpdate, {
      props: { user: mockUser },
    });
    expect(component.text()).toContain("Editor");
  });

  it("emits onDeleteUser with the user id when delete succeeds", async () => {
    const deleteHandler = vi.fn(() => ({ success: true }));
    cleanups.push(
      registerEndpoint(userEndpoint, {
        method: "DELETE",
        once: true,
        handler: deleteHandler,
      })
    );

    const component = await mountSuspended(UserUpdate, {
      props: { user: mockUser },
    });

    const deleteButton = component
      .findAll("button")
      .find((b) => b.text().includes("Delete"));
    // Buttons disable when you act on your own account; tests have no session
    // user, so this stays enabled and the click actually goes through.
    expect(deleteButton?.attributes("disabled")).toBeUndefined();
    await deleteButton?.trigger("click");
    await flushPromises();

    // The handler being invoked proves the DELETE hit /api/users/:id
    expect(deleteHandler).toHaveBeenCalledTimes(1);
    expect(component.emitted("onDeleteUser")).toBeTruthy();
    expect(component.emitted("onDeleteUser")![0]).toEqual([mockUser.id]);
  });

  it("does not emit onDeleteUser when delete fails", async () => {
    const deleteHandler = vi.fn(() => {
      throw createError({ statusCode: 403, statusMessage: "Forbidden" });
    });
    cleanups.push(
      registerEndpoint(userEndpoint, {
        method: "DELETE",
        once: true,
        handler: deleteHandler,
      })
    );

    const component = await mountSuspended(UserUpdate, {
      props: { user: mockUser },
    });

    const deleteButton = component
      .findAll("button")
      .find((b) => b.text().includes("Delete"));
    await deleteButton?.trigger("click");
    await flushPromises();

    // Positive control: prove the DELETE actually fired and failed, so the
    // "not emitted" assertion reflects failure handling, not a missed click.
    expect(deleteHandler).toHaveBeenCalledTimes(1);
    expect(component.emitted("onDeleteUser")).toBeFalsy();
  });

  it("sends a PUT request with the roles on form submit", async () => {
    let capturedBody: unknown;
    cleanups.push(
      registerEndpoint(userEndpoint, {
        method: "PUT",
        once: true,
        handler: async (event: H3Event) => {
          capturedBody = await readBody(event);
          return { success: true };
        },
      })
    );

    const component = await mountSuspended(UserUpdate, {
      props: { user: mockUser },
    });

    await component.find("form").trigger("submit");
    await flushPromises();

    expect(capturedBody).toEqual({ roles: mockUser.roles });
  });

  it("surfaces an error toast when the update fails", async () => {
    cleanups.push(
      registerEndpoint(userEndpoint, {
        method: "PUT",
        once: true,
        handler: () => {
          throw createError({
            statusCode: 400,
            statusMessage: "Validation failed",
          });
        },
      })
    );

    const component = await mountSuspended(UserUpdate, {
      props: { user: mockUser },
    });

    await component.find("form").trigger("submit");
    await flushPromises();

    // The rejected PUT must be caught and reported to the user, not rethrown.
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({ color: "error", title: "Error updating user" })
    );
  });
});
