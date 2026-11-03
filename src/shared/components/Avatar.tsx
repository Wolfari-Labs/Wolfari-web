import { useState } from 'react';
import styles from './Ui.module.css';

export function Avatar({
  name,
  image,
}: {
  name: string;
  image?: { src: string; alt: string } | null;
}) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toLocaleUpperCase('vi');
  return (
    <span className={styles.avatar} aria-hidden="true">
      {image && !failed ? (
        <img
          src={image.src}
          alt=""
          width="44"
          height="44"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        initials || '?'
      )}
    </span>
  );
}
