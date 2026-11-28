import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PlacePhoto } from '../src/features/map/PlacePhoto';

describe('place photo', () => {
  it('shows a local illustrative photo when a place has no photo', () => {
    render(<PlacePhoto image={null} name="Hội An" />);
    const fallback = screen.getByRole('img', { name: 'Ảnh minh họa cho Hội An' });

    expect(fallback).toHaveAttribute('src', expect.stringContaining('16cac'));
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows the licensed photo and uses the local illustration if downloading it fails', () => {
    const image = {
      url: '/api/v1/travel/poi-images/test/1280.webp',
      thumbnailUrl: '/api/v1/travel/poi-images/test/640.webp',
      smallUrl: '/api/v1/travel/poi-images/test/320.webp',
      width: null,
      height: null,
      author: null,
      licenseUrl: null,
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
    expect(screen.getByRole('img', { name: 'Ảnh minh họa cho Hội An' })).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
