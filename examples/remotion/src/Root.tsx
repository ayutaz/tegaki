import { Composition, useCurrentFrame, useVideoConfig } from 'remotion';
import { TegakiRenderer } from 'tegaki';
import caveat from 'tegaki/fonts/caveat';

const Handwriting = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = frame / durationInFrames;
  return (
    <div style={{ flex: 1, backgroundColor: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <TegakiRenderer
        font={caveat}
        text="What a wonderful world"
        style={{ fontSize: 120 }}
        time={{ mode: 'controlled', value: progress, unit: 'progress' }}
      />
    </div>
  );
};

export const RemotionRoot: React.FC = () => {
  return <Composition id="Handwriting" component={Handwriting} durationInFrames={180} fps={60} width={1920} height={1080} />;
};
