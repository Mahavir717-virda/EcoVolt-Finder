import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '../features/auth/authStore';
import { AuthNavigator } from './AuthStack';
import { DriverNavigator } from './DriverTabs';
import { ManagerNavigator } from './ManagerStack';
import { AdminNavigator } from './AdminStack';
import { Spinner } from '../components/feedback/Spinner';

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, role, isHydrating, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (isHydrating) {
    return <Spinner fullScreen size="large" />;
  }

  const renderContent = () => {
    if (!isAuthenticated) {
      return <AuthNavigator />;
    }

    switch (role) {
      case 'manager':
        return <ManagerNavigator />;
      case 'admin':
        return <AdminNavigator />;
      case 'driver':
      default:
        return <DriverNavigator />;
    }
  };

  return <NavigationContainer>{renderContent()}</NavigationContainer>;
};
