import React from 'react';
import { BarberProvider, useBarber } from './context/BarberContext';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { QueueDisplay } from './components/QueueDisplay';

const MainRouter = () => {
  const { currentUser } = useBarber();

  if (!currentUser) {
    return <Login />;
  }

  if (currentUser.role === 'display') {
    return <QueueDisplay />;
  }

  return <Dashboard />;
};

import { HashRouter } from 'react-router-dom';

function App() {
  return (
    <HashRouter>
      <BarberProvider>
        <MainRouter />
      </BarberProvider>
    </HashRouter>
  );
}

export default App;