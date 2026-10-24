import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CitationChip } from '../components/CitationChip';
import { Timeline } from '../components/Timeline';
import { AudioControls } from '../components/AudioControls';
import type { Source, TimelineEvent } from '../types';

describe('CitationChip Component', () => {
  it('renders citation chip and calls onSelect with quote on click', () => {
    const handleSelect = vi.fn();
    const source: Source = {
      id: 'S1',
      kind: 'web',
      title: 'Global News Report',
      publisher: 'The Hindu',
      language: 'en-IN',
      original_text: 'Body text excerpt',
      model_text: 'Body text excerpt',
      machine_translated: false,
    };

    render(
      <CitationChip
        sourceId="S1"
        source={source}
        quote="Exact verbatim evidence quote here"
        onSelect={handleSelect}
      />
    );

    const button = screen.getByRole('button', { name: /View evidence source S1 · The Hindu/i });
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(handleSelect).toHaveBeenCalledWith('S1', 'Exact verbatim evidence quote here');
  });

  it('renders S0 as Newspaper chip', () => {
    const handleSelect = vi.fn();
    render(
      <CitationChip
        sourceId="S0"
        onSelect={handleSelect}
      />
    );
    expect(screen.getByText(/S0 · Newspaper/i)).toBeInTheDocument();
  });
});

describe('Timeline Component', () => {
  it('renders unknown date badge when event_date is null', () => {
    const events: TimelineEvent[] = [
      {
        id: 'E1',
        event_date: null,
        date_precision: 'unknown',
        title: 'Undated Event Occurred',
        description: 'Details of the undated event description',
        evidence: [{ source_id: 'S0', quote: 'Sample quote' }],
        verification: 'verified',
      },
    ];

    render(<Timeline events={events} sources={[]} onSelectCitation={vi.fn()} />);

    expect(screen.getByText('Undated Event Occurred')).toBeInTheDocument();
    expect(screen.getByText('Unknown Date')).toBeInTheDocument();
  });

  it('renders unverified badge when applicable', () => {
    const events: TimelineEvent[] = [
      {
        id: 'E1',
        event_date: '2026-10-15',
        date_precision: 'day',
        title: 'Unverified Claim Event',
        description: 'Details contains figures not in quote',
        evidence: [{ source_id: 'S0', quote: 'Sample quote' }],
        verification: 'unverified',
      },
    ];

    render(<Timeline events={events} sources={[]} onSelectCitation={vi.fn()} />);
    expect(screen.getByText('Unverified Details')).toBeInTheDocument();
  });
});

describe('AudioControls Component', () => {
  it('shows tap to play button when autoplay rejects', async () => {
    // Mock HTMLMediaElement play rejecting
    window.HTMLMediaElement.prototype.play = vi.fn().mockRejectedValue(new Error('Autoplay blocked'));
    window.HTMLMediaElement.prototype.pause = vi.fn();

    // Valid dummy base64 wav header
    const dummyBase64 = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=';

    render(<AudioControls base64Audio={dummyBase64} autoPlay={true} />);

    // Tap to listen button should be visible when autoplay is blocked
    const tapButton = await screen.findByText(/Tap to Listen/i);
    expect(tapButton).toBeInTheDocument();
  });
});

import { renderHook, act } from '@testing-library/react';
import { useRecorder } from '../hooks/useRecorder';

describe('useRecorder Hook', () => {
  it('handles microphone permission denial gracefully', async () => {
    // Mock getUserMedia rejecting with PermissionDeniedError
    const permissionError = new Error('Permission denied');
    permissionError.name = 'NotAllowedError';
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockRejectedValue(permissionError),
      },
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(false);
    expect(result.current.error).toContain('permission was denied');
  });
});
