import { createPortal } from 'react-dom';

/**
 * Renders children into document.body via a React portal.
 * This ensures modals always center on the true viewport,
 * regardless of parent scroll containers or transforms.
 */
const ModalPortal = ({ children }) => {
    return createPortal(children, document.body);
};

export default ModalPortal;
