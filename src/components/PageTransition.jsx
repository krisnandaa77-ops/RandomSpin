import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const PageTransition = ({ children }) => {
  const location = useLocation();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitionStage, setTransitionStage] = useState('page-enter');

  useEffect(() => {
    setTransitionStage('page-exit');
    const timeout = setTimeout(() => {
      setDisplayChildren(children);
      setTransitionStage('page-enter');
    }, 200);
    return () => clearTimeout(timeout);
  }, [location.pathname]);

  return (
    <div className={`page-transition ${transitionStage}`}>
      {displayChildren}
    </div>
  );
};

export default PageTransition;
