import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PlacePhoto } from '../src/features/map/PlacePhoto';

describe('licensed place photo', () => {
  it('shows the actual photo with credit and uses a neutral fallback after a download failure', () => {
    const image = {
      url: '/api/v1/travel/poi-images/test/1280.webp',
      thumbnailUrl: '/api/v1/travel/poi-images/test/640.webp',
      smallUrl: '/api/v1/travel/poi-images/test/320.webp',
      attribution: 'Ảnh An · CC BY-SA 4.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Place.jpg',
      license: 'CC-BY-SA-4.0',
    };
    render(<PlacePhoto image={image} name="Hội An" linked />);
    const photo = screen.getByRole('img', { name: 'Ảnh Hội An' });
    expect(photo).toHaveAttribute('src', image.thumbnailUrl);
    expect(screen.getByRole('link', { name: image.attribution })).toHaveAttribute(
      'href',
      image.sourceUrl,
    );
    fireEvent.error(photo);
    expect(screen.getByRole('img', { name: 'Hội An chưa có ảnh' })).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
