import React from 'react';
import {Composition} from 'remotion';
import {Scene} from './Scene';
import {Backdrop} from './Backdrop';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Main"
        component={() => (
          <>
            <Backdrop />
            <Scene />
          </>
        )}
        durationInFrames={300}
        fps={60}
        width={1920}
        height={1080}
      />
    </>
  );
};