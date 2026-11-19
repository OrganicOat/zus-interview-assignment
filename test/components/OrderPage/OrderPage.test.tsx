import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '@/App';
import { resetMockServer, updateApiSimulation } from '@/api';
import { ApiErrorCode, OrderStatus } from '@/enums';
import { useOrderStore, useRefundStore } from '@/store';

// Helper to open the Refund modal after the Order Page finishes loading
async function renderAndOpenRefundModal() {
  render(<App />);
  const refundButton = await screen.findByRole('button', { name: /^refund$/i });
  fireEvent.click(refundButton);
  const dialog = await screen.findByRole(
    'dialog',
    { name: /refund order ord-10482/i },
    { timeout: 5000 }
  );
  return { dialog, refundButton };
}

// Helper to choose a Radix Select option by its label text
async function selectReasonOption(reasonText: string) {
  const selectTrigger = screen.getByRole('combobox', { name: /refund reason/i });
  fireEvent.click(selectTrigger);
  const listbox = await screen.findByRole('listbox');
  fireEvent.click(within(listbox).getByRole('option', { name: reasonText }));
}

describe('End-to-end Refund Flow UI tests', () => {
  beforeEach(() => {
    resetMockServer();
    updateApiSimulation({ latencyMs: 0, failureRate: 0, nextFailure: 'NONE' });
    useOrderStore.setState({
      order: null,
      fetchStatus: 'idle',
      fetchError: null,
      refundHistory: [],
      notification: null,
    });
    useRefundStore.getState().completeSubmitting();
  });

  it('renders order page with per-unit rows, add-ons, delivery fee, and Refund button', async () => {
    render(<App />);

    expect(await screen.findByText('Order ORD-10482')).toBeInTheDocument();
    expect(screen.getByText('Order Items (7 units)')).toBeInTheDocument();
    expect(screen.getByText('Unit ID: L1-1')).toBeInTheDocument();
    expect(screen.getByText('Unit ID: L1-2')).toBeInTheDocument();
    expect(screen.getByText('Unit ID: L2-1')).toBeInTheDocument();
    expect(screen.getByText('Unit ID: L2-2')).toBeInTheDocument();
    expect(screen.getByText('Unit ID: L3-1')).toBeInTheDocument();
    expect(screen.getByText('Unit ID: L3-2')).toBeInTheDocument();
    expect(screen.getByText('Unit ID: L3-3')).toBeInTheDocument();
    expect(screen.getByText('Delivery Fee')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^refund$/i })).toBeEnabled();
  });

  it('locks already-refunded items, enforces add-on pairing, and supports L2-2 paid add-ons', async () => {
    const { dialog } = await renderAndOpenRefundModal();

    // Already-refunded items must be disabled
    expect(
      within(dialog).getByRole('checkbox', { name: /select iced spanish latte unit l1-1/i })
    ).toBeDisabled();
    expect(
      within(dialog).getByRole('checkbox', { name: /select add-on extra shot for unit l1-1/i })
    ).toBeDisabled();
    expect(
      within(dialog).getByRole('checkbox', {
        name: /select hazelnut americano.*unit l2-2/i,
      })
    ).toBeDisabled();

    // Next button starts disabled when total is 0
    expect(within(dialog).getByRole('button', { name: /^next$/i })).toBeDisabled();

    // Selecting paid add-on on L1-2 auto-selects main drink L1-2 (13.90 + 2.00 = 15.90)
    const l12Addon = within(dialog).getByRole('checkbox', {
      name: /select add-on extra shot for unit l1-2/i,
    });
    const l12Unit = within(dialog).getByRole('checkbox', {
      name: /select iced spanish latte unit l1-2/i,
    });

    fireEvent.click(l12Addon);
    expect(l12Addon).toBeChecked();
    expect(l12Unit).toBeChecked();
    expect(within(dialog).getByText(/MYR\s*15\.90/)).toBeInTheDocument();

    // Unchecking main drink L1-2 automatically unchecks its add-on
    fireEvent.click(l12Unit);
    expect(l12Unit).not.toBeChecked();
    expect(l12Addon).not.toBeChecked();
    expect(within(dialog).getByRole('button', { name: /^next$/i })).toBeDisabled();

    // L2-2 drink is already refunded, so its remaining paid add-ons can still be refunded
    const l22OatMilk = within(dialog).getByRole('checkbox', {
      name: /select add-on oat milk for unit l2-2/i,
    });
    const l22Syrup = within(dialog).getByRole('checkbox', {
      name: /select add-on brown sugar syrup for unit l2-2/i,
    });

    fireEvent.click(l22OatMilk);
    fireEvent.click(l22Syrup);
    expect(within(dialog).getByText(/MYR\s*2\.50/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /^next$/i })).toBeEnabled();
  });

  it(
    'closes only confirmation dialog on Cancel, preserves Back navigation, and closes all dialogs on Confirm success',
    async () => {
      const { dialog } = await renderAndOpenRefundModal();

      // Select Butter Croissant unit L3-1 (MYR 7.90) + Delivery Fee (MYR 5.00) = MYR 12.90
      fireEvent.click(
        within(dialog).getByRole('checkbox', { name: /select butter croissant unit l3-1/i })
      );
      fireEvent.click(
        within(dialog).getByRole('checkbox', { name: /include delivery fee in refund/i })
      );
      expect(within(dialog).getByText(/MYR\s*12\.90/)).toBeInTheDocument();

      // Move to Step 2 and verify Back preserves selection
      fireEvent.click(within(dialog).getByRole('button', { name: /^next$/i }));
      expect(within(dialog).getByText(/refund preview/i)).toBeInTheDocument();

      fireEvent.click(within(dialog).getByRole('button', { name: /^back$/i }));
      expect(
        within(dialog).getByRole('checkbox', { name: /select butter croissant unit l3-1/i })
      ).toBeChecked();

      // Return to Step 2
      fireEvent.click(within(dialog).getByRole('button', { name: /^next$/i }));

      // Confirm button disabled until both Reason and Channel are selected
      const confirmStep2Btn = within(dialog).getByRole('button', { name: /^confirm$/i });
      expect(confirmStep2Btn).toBeDisabled();

      // Select Reason = Other + optional note
      await selectReasonOption('Other');
      const noteField = within(dialog).getByLabelText(/additional note/i);
      fireEvent.change(noteField, { target: { value: 'Croissant arrived crushed' } });
      expect(confirmStep2Btn).toBeDisabled();

      // Choose Channel: In-app credit
      fireEvent.click(within(dialog).getByText('In-app credit'));
      expect(confirmStep2Btn).toBeEnabled();

      // Open Step 3 confirmation dialog
      fireEvent.click(confirmStep2Btn);
      const confirmDialog = await screen.findByRole('alertdialog', { name: /confirm refund/i });

      // Clicking Cancel in Step 3 closes ONLY confirmation dialog; refund modal stays open
      fireEvent.click(within(confirmDialog).getByRole('button', { name: /^cancel$/i }));
      await waitFor(() => {
        expect(screen.queryByRole('alertdialog', { name: /confirm refund/i })).not.toBeInTheDocument();
      });
      const activeModal = await screen.findByRole('dialog', { name: /refund order ord-10482/i });

      // Re-open Step 3 and submit
      fireEvent.click(within(activeModal).getByRole('button', { name: /^confirm$/i }));
      const confirmDialogAgain = await screen.findByRole('alertdialog', { name: /confirm refund/i });
      fireEvent.click(within(confirmDialogAgain).getByRole('button', { name: /confirm refund/i }));

      // On success, ALL dialogs close and staff return to updated Order Page
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      expect(screen.getByText(/refund activity \(1\)/i)).toBeInTheDocument();
      expect(screen.getByText(/croissant arrived crushed/i)).toBeInTheDocument();
      expect(screen.getByText(/revision v2/i)).toBeInTheDocument();
    },
    15000
  );

  it(
    'recovers gracefully from API failure and succeeds safely on retry with same idempotency key',
    async () => {
      updateApiSimulation({ latencyMs: 0, nextFailure: ApiErrorCode.NETWORK_TIMEOUT });
      const { dialog } = await renderAndOpenRefundModal();

      fireEvent.click(
        within(dialog).getByRole('checkbox', { name: /select butter croissant unit l3-2/i })
      );
      fireEvent.click(within(dialog).getByRole('button', { name: /^next$/i }));

      await selectReasonOption('Missing item');
      fireEvent.click(within(dialog).getByText('Original payment method'));

      const keyBeforeFailure = useRefundStore.getState().idempotencyKey;

      fireEvent.click(within(dialog).getByRole('button', { name: /^confirm$/i }));
      const confirmDialog = await screen.findByRole('alertdialog', { name: /confirm refund/i });
      fireEvent.click(within(confirmDialog).getByRole('button', { name: /confirm refund/i }));

      // Wait for confirmation dialog to finish closing and return focus to Step 2
      await waitFor(() => {
        expect(screen.queryByRole('alertdialog', { name: /confirm refund/i })).not.toBeInTheDocument();
      });
      const activeModal = await screen.findByRole('dialog', { name: /refund order ord-10482/i });

      expect(
        within(activeModal).getByText(/refund could not be completed/i)
      ).toBeInTheDocument();
      expect(
        within(activeModal).getByText(/this refund will not be processed twice/i)
      ).toBeInTheDocument();
      expect(useRefundStore.getState().idempotencyKey).toBe(keyBeforeFailure);

      // Retry succeeds cleanly with same idempotency key
      fireEvent.click(within(activeModal).getByRole('button', { name: /^confirm$/i }));
      const confirmRetry = await screen.findByRole('alertdialog', { name: /confirm refund/i });
      fireEvent.click(within(confirmRetry).getByRole('button', { name: /confirm refund/i }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      expect(screen.getByText(/refund activity \(1\)/i)).toBeInTheDocument();
    },
    15000
  );

  it('prevents duplicate submission on rapid double-click during slow network response', async () => {
    updateApiSimulation({ latencyMs: 120, nextFailure: 'NONE' });
    const { dialog } = await renderAndOpenRefundModal();

    fireEvent.click(
      within(dialog).getByRole('checkbox', { name: /select butter croissant unit l3-3/i })
    );
    fireEvent.click(within(dialog).getByRole('button', { name: /^next$/i }));

    await selectReasonOption('Quality issue');
    fireEvent.click(within(dialog).getByText('In-app credit'));

    fireEvent.click(within(dialog).getByRole('button', { name: /^confirm$/i }));
    const confirmDialog = await screen.findByRole('alertdialog', { name: /confirm refund/i });
    const submitBtn = within(confirmDialog).getByRole('button', { name: /confirm refund/i });

    // Rapid double-click
    fireEvent.click(submitBtn);
    fireEvent.click(submitBtn);

    expect(within(confirmDialog).getByRole('button', { name: /processing/i })).toBeDisabled();

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // Only a single refund record created
    expect(useOrderStore.getState().refundHistory).toHaveLength(1);
    expect(screen.getByText(/refund activity \(1\)/i)).toBeInTheDocument();
  });

  it(
    'selects all items + delivery fee for full refund and disables Refund button afterwards',
    async () => {
      const { dialog, refundButton } = await renderAndOpenRefundModal();

      fireEvent.click(within(dialog).getByRole('checkbox', { name: /select all refundable items/i }));
      expect(within(dialog).getByText('Full item refund')).toBeInTheDocument();
      expect(within(dialog).getByText(/MYR\s*56\.50/)).toBeInTheDocument();

      fireEvent.click(
        within(dialog).getByRole('checkbox', { name: /include delivery fee in refund/i })
      );
      expect(within(dialog).getByText(/MYR\s*61\.50/)).toBeInTheDocument();

      fireEvent.click(within(dialog).getByRole('button', { name: /^next$/i }));
      await selectReasonOption('Late delivery');
      fireEvent.click(within(dialog).getByText('Original payment method'));

      fireEvent.click(within(dialog).getByRole('button', { name: /^confirm$/i }));
      const confirmDialog = await screen.findByRole('alertdialog', { name: /confirm refund/i });
      fireEvent.click(within(confirmDialog).getByRole('button', { name: /confirm refund/i }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      expect(refundButton).toBeDisabled();
      expect(useOrderStore.getState().order?.status).toBe(OrderStatus.REFUNDED);
    },
    15000
  );

  it(
    'supports consecutive refunds of different items across separate submissions',
    async () => {
      const { dialog, refundButton } = await renderAndOpenRefundModal();

      // First refund: unit L3-1
      fireEvent.click(
        within(dialog).getByRole('checkbox', { name: /select butter croissant unit l3-1/i })
      );
      fireEvent.click(within(dialog).getByRole('button', { name: /^next$/i }));
      await selectReasonOption('Missing item');
      fireEvent.click(within(dialog).getByText('In-app credit'));
      fireEvent.click(within(dialog).getByRole('button', { name: /^confirm$/i }));
      const confirmFirst = await screen.findByRole('alertdialog', { name: /confirm refund/i });
      fireEvent.click(within(confirmFirst).getByRole('button', { name: /confirm refund/i }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      expect(screen.getByText(/refund activity \(1\)/i)).toBeInTheDocument();

      // Second refund: unit L1-2 (auto-selects Extra Shot add-on -> MYR 15.90)
      fireEvent.click(refundButton);
      const secondDialog = await screen.findByRole('dialog', { name: /refund order ord-10482/i });
      fireEvent.click(
        within(secondDialog).getByRole('checkbox', { name: /select iced spanish latte unit l1-2/i })
      );
      expect(
        within(secondDialog).getByRole('checkbox', {
          name: /select add-on extra shot for unit l1-2/i,
        })
      ).toBeChecked();
      expect(within(secondDialog).getByText(/MYR\s*15\.90/)).toBeInTheDocument();

      fireEvent.click(within(secondDialog).getByRole('button', { name: /^next$/i }));
      await selectReasonOption('Wrong item');
      fireEvent.click(within(secondDialog).getByText('Original payment method'));
      fireEvent.click(within(secondDialog).getByRole('button', { name: /^confirm$/i }));
      const confirmSecond = await screen.findByRole('alertdialog', { name: /confirm refund/i });
      fireEvent.click(within(confirmSecond).getByRole('button', { name: /confirm refund/i }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      expect(screen.getByText(/refund activity \(2\)/i)).toBeInTheDocument();
      expect(screen.getByText(/revision v3/i)).toBeInTheDocument();
    },
    15000
  );
});
