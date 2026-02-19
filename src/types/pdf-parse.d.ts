declare module "pdf-parse" {
    interface PDFData {
        numpages: number;
        numrender: number;
        info: {
            PDFFormatVersion?: string;
            IsAcroFormPresent?: boolean;
            IsXFAPresent?: boolean;
            Title?: string;
            Author?: string;
            Subject?: string;
            Keywords?: string;
            Creator?: string;
            Producer?: string;
            CreationDate?: string;
            ModDate?: string;
        };
        metadata: Record<string, unknown> | null;
        text: string;
        version: string;
    }

    interface PDFOptions {
        pagerender?: (pageData: { pageIndex: number; numPages: number }) => Promise<string>;
        max?: number;
        version?: string;
    }

    function pdfParse(dataBuffer: Buffer, options?: PDFOptions): Promise<PDFData>;

    export = pdfParse;
}
