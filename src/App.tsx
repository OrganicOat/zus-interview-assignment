import * as Tooltip from '@radix-ui/react-tooltip';
import { OrderPage } from './components/OrderPage/OrderPage';

export function App() {
  return (
    <Tooltip.Provider delayDuration={200}>
      <OrderPage />
    </Tooltip.Provider>
  );
}
