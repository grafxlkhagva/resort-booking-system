import { X } from 'lucide-react';
import { useLanguage } from "@/contexts/LanguageContext";

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
}

export default function ConfirmationModal({ isOpen, onClose, onConfirm, title, message }: ConfirmationModalProps) {
    const { t } = useLanguage();
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto outline-none focus:outline-none">
            <div className="fixed inset-0 bg-black opacity-50" onClick={onClose}></div>
            <div className="relative w-full max-w-md mx-auto my-6 z-50">
                <div className="relative flex flex-col w-full bg-white border-0 rounded-lg shadow-lg outline-none focus:outline-none">
                    {/* Header */}
                    <div className="flex items-start justify-between p-5 border-b border-solid border-gray-200 rounded-t">
                        <h3 className="text-xl font-semibold text-gray-900">
                            {title}
                        </h3>
                        <button
                            className="p-1 ml-auto bg-transparent border-0 text-black float-right text-3xl leading-none font-semibold outline-none focus:outline-none"
                            onClick={onClose}
                        >
                            <X className="w-6 h-6 text-gray-500" />
                        </button>
                    </div>
                    {/* Body */}
                    <div className="relative p-6 flex-auto">
                        <p className="my-4 text-gray-600 text-lg leading-relaxed">
                            {message}
                        </p>
                    </div>
                    {/* Footer */}
                    <div className="flex items-center justify-end p-6 border-t border-solid border-gray-200 rounded-b">
                        <button
                            className="text-gray-500 background-transparent font-bold uppercase px-6 py-2 text-sm outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150 hover:text-gray-700"
                            type="button"
                            onClick={onClose}
                        >
                            {t('cancel', 'Болих')}
                        </button>
                        <button
                            className="bg-red-500 text-white active:bg-red-600 font-bold uppercase text-sm px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
                            type="button"
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                        >
                            {t('delete', 'Устгах')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
