import { GridPage } from './GridPage';
import { ImportPage } from './ImportPage';
import { MorePage } from './MorePage';
import { PiecePage } from './PiecePage';
import { StatusesPage } from './StatusesPage';
import { useRoute } from './ui';

export function App() {
  const [page, arg] = useRoute();
  switch (page) {
    case 'piece': return <PiecePage key={arg} id={Number(arg)} />;
    case 'statuses': return <StatusesPage />;
    case 'import': return <ImportPage />;
    case 'backup': return <MorePage />;
    default: return <GridPage />;
  }
}
