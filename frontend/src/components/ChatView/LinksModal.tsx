import React from 'react';

interface LinksModalProps {
	isOpen: boolean;
	onClose: () => void;
	links: string[];
	isDarkMode: boolean;
}

export default function LinksModal({
	isOpen,
	onClose,
	links,
	isDarkMode
}: LinksModalProps) {
	if (!isOpen || links.length === 0) return null;

	// Parse links in format "Title|URL" or as objects {title, url}
	const parsedLinks = links.map((link) => {
		if (typeof link === 'string') {
			const parts = link.split('|');
			return {
				title: parts[0] || 'Link',
				url: parts[1] || link
			};
		}
		// Handle object format (legacy data)
		const linkObj = link as unknown as { name?: string; title?: string; url?: string };
		return {
			title: linkObj.name || linkObj.title || 'Link',
			url: linkObj.url || ''
		};
	});

	return (
		<div className="hidden sm:block sm:w-[20%] h-[calc(50vh)] fixed right-8 top-20 2xl:right-40 z-10">
			<div className={`w-full sm:w-[80%] h-full overflow-x-hidden overflow-y-auto ${
				isDarkMode ? 'bg-gray-900 text-gray-300' : 'bg-gray-50 text-gray-700'
			} sm:rounded-lg`}>
				<div className="p-4 space-y-1.5">
					<div className="flex items-center justify-between mb-3">
						<div className={`text-xs font-medium ${
							isDarkMode ? 'text-gray-400' : 'text-gray-500'
						}`}>
							Related Links
						</div>
						<button
							onClick={onClose}
							className={`p-1 rounded-md ${
								isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
							}`}
						>
							<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>
					{parsedLinks.map((link, index) => (
						<a
							key={index}
							href={link.url}
							target="_blank"
							rel="noopener noreferrer"
							className={`block w-full p-3 rounded-lg cursor-pointer transition-all duration-200 ${
								isDarkMode
									? 'hover:bg-gray-800/70 text-gray-100 border border-transparent hover:border-gray-700'
									: 'hover:bg-gray-200/80 text-gray-700 border border-transparent hover:border-gray-200'
							}`}
						>
							<div className="flex items-start gap-2">
								<div className="flex-1 min-w-0">
									<div className="text-sm font-medium line-clamp-2">
										{link.title}
									</div>
									<div className={`text-xs truncate mt-1 ${
										isDarkMode ? 'text-gray-400' : 'text-gray-500'
									}`}>
										{link.url}
									</div>
								</div>
								<svg
									className={`h-4 w-4 flex-shrink-0 mt-0.5 ${
										isDarkMode ? 'text-gray-400' : 'text-gray-500'
									}`}
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
									/>
								</svg>
							</div>
						</a>
					))}
				</div>
			</div>
		</div>
	);
}
