import { ImgHTMLAttributes } from 'react';

export default function ApplicationLogo(props: ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <img
            width="40"
            height="40"
            decoding="async"
            {...props}
            src="/logo/logoswissbell.jpg"
            alt={props.alt || "Swiss-Belinn SKA Pekanbaru Logo"}
        />
    );
}
