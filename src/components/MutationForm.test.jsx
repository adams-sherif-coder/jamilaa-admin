import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MutationForm } from "./UI";
import { request } from "../lib/api";
const { requestMock } = vi.hoisted(() => ({ requestMock: vi.fn() }));
vi.mock("../lib/api", () => ({
  request: requestMock,
  currentActor: "owner:1",
  api: { util: { invalidateTags: () => ({ type: "invalidate" }) } },
  useReadQuery: vi.fn(),
  queryString: vi.fn(),
}));
vi.mock("../lib/operations", () => ({
  operationKey: async (actor, signature) => ({
    hash: signature,
    key: signature.includes('"preview":true')
      ? "preview-operation-uuid"
      : "commit-operation-uuid",
  }),
  acknowledge: vi.fn(),
}));
const renderForm = () =>
  render(
    <Provider store={configureStore({ reducer: (state = {}) => state })}>
      <MutationForm
        path="/commit"
        previewPath="/preview"
        fields={[{ name: "reason", required: true }]}
      />
    </Provider>,
  );
beforeEach(() => requestMock.mockReset());
afterEach(cleanup);
it("reviews server output before commit and uses different preview/commit identities", async () => {
  requestMock
    .mockResolvedValueOnce({ count: 3, preview: true })
    .mockResolvedValueOnce({ count: 3, preview: false });
  renderForm();
  fireEvent.change(screen.getByLabelText("السبب"), {
    target: { value: "تصحيح" },
  });
  fireEvent.click(screen.getByRole("button", { name: "معاينة ومراجعة" }));
  await screen.findByRole("button", { name: "تأكيد التنفيذ" });
  expect(request).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "تأكيد التنفيذ" }));
  await screen.findByText("تم الحفظ بنجاح");
  expect(requestMock.mock.calls[0][1]).toMatchObject({
    body: { reason: "تصحيح", preview: true },
    key: "preview-operation-uuid",
  });
  expect(requestMock.mock.calls[1][1]).toMatchObject({
    body: { reason: "تصحيح", preview: false },
    key: "commit-operation-uuid",
  });
});
it("freezes uncertain requests and retries the identical operation", async () => {
  requestMock
    .mockRejectedValueOnce({ status: "NETWORK", message: "انقطع الاتصال" })
    .mockResolvedValueOnce({ count: 2 });
  renderForm();
  fireEvent.change(screen.getByLabelText("السبب"), {
    target: { value: "تالف" },
  });
  fireEvent.click(screen.getByRole("button", { name: "معاينة ومراجعة" }));
  await screen.findByText("انقطع الاتصال");
  expect(screen.getByLabelText("السبب")).toBeDisabled();
  fireEvent.click(
    screen.getByRole("button", { name: "إعادة نفس الطلب بأمان" }),
  );
  await waitFor(() => expect(requestMock).toHaveBeenCalledTimes(2));
  expect(requestMock.mock.calls[1]).toEqual(requestMock.mock.calls[0]);
});
it("cancelling a reviewed preview never commits", async () => {
  requestMock.mockResolvedValue({ count: 1 });
  renderForm();
  fireEvent.change(screen.getByLabelText("السبب"), {
    target: { value: "فحص" },
  });
  fireEvent.click(screen.getByRole("button", { name: "معاينة ومراجعة" }));
  fireEvent.click(
    await screen.findByRole("button", { name: "العودة للتعديل" }),
  );
  expect(requestMock).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText("السبب")).toBeEnabled();
});
